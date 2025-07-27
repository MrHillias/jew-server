const express = require("express");
const { User, UserRelation, RelationType } = require("../associations");
const Hebcal = require("hebcal");
const { Op } = require("sequelize");
const sequelize = require("../db");

const router = express.Router();

const calculateAge = require("../ageCalculator");

// Функция для определения обратного типа связи с учетом пола
async function getReverseRelationType(relationType, userGender) {
  const typeInfo = await RelationType.findOne({
    where: { type: relationType },
  });

  if (!typeInfo || !typeInfo.reverseType) {
    return null;
  }

  let reverseType = typeInfo.reverseType;

  // Корректируем тип в зависимости от пола
  if (typeInfo.genderSpecific) {
    switch (typeInfo.reverseType) {
      case "child":
        reverseType = userGender === "М" ? "son" : "daughter";
        break;
      case "parent":
        reverseType = userGender === "М" ? "father" : "mother";
        break;
      case "sibling":
        reverseType = userGender === "М" ? "brother" : "sister";
        break;
      case "grandchild":
        reverseType = userGender === "М" ? "grandson" : "granddaughter";
        break;
      case "grandparent":
        reverseType = userGender === "М" ? "grandfather" : "grandmother";
        break;
      case "nephew":
      case "niece":
        reverseType = userGender === "М" ? "uncle" : "aunt";
        break;
      case "uncle":
      case "aunt":
        reverseType = userGender === "М" ? "nephew" : "niece";
        break;
      case "cousin":
        reverseType = userGender === "М" ? "cousin_male" : "cousin_female";
        break;
    }
  }

  return reverseType;
}

// API для занесения нового пользователя с родственными связями
router.post("/reg", async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      firstName,
      lastName,
      fatherName,
      birthDate,
      mobileNumber,
      email,
      gender,
      address,
      religiousInfo,
      relations = [], // Новое поле для родственных связей
    } = req.body;

    console.log(
      "Создание нового пользователя:",
      firstName,
      lastName,
      fatherName,
      birthDate
    );
    console.log("Родственные связи:", relations);

    // Преобразование даты рождения в еврейскую дату
    const date = new Date(birthDate);
    const hebrewDate = new Hebcal.HDate(date);
    const hebrewDateString = hebrewDate.toString();

    const age = calculateAge(birthDate);

    // Создаем пользователя
    const userInfo = await User.create(
      {
        firstName: firstName,
        lastName: lastName,
        fatherName: fatherName,
        birthDate: birthDate || null,
        hebrewDate: hebrewDateString || null,
        age: age,
        mobileNumber: mobileNumber,
        email: email,
        gender: gender,
        address: address,
        religiousInfo: religiousInfo,
      },
      { transaction }
    );

    console.log("Пользователь создан с ID:", userInfo.id);

    // Обрабатываем родственные связи, если они есть
    const createdRelations = [];

    for (const relation of relations) {
      const {
        relatedUserId,
        relationType,
        relatedPersonInfo,
        createReverse = true,
      } = relation;

      try {
        // Создаем связь для нового пользователя
        const newRelation = await UserRelation.create(
          {
            userId: userInfo.id,
            relatedUserId: relatedUserId || null,
            relationType: relationType,
            relatedPersonInfo: relatedUserId ? null : relatedPersonInfo,
            notes: relation.notes || null,
          },
          { transaction }
        );

        createdRelations.push(newRelation);
        console.log(
          `Создана связь: ${relationType} с ${
            relatedUserId || "внешним родственником"
          }`
        );

        // Если это связь с существующим пользователем и нужна обратная связь
        if (relatedUserId && createReverse) {
          const reverseType = await getReverseRelationType(
            relationType,
            userInfo.gender
          );

          if (reverseType) {
            const reverseRelation = await UserRelation.create(
              {
                userId: relatedUserId,
                relatedUserId: userInfo.id,
                relationType: reverseType,
                notes: `Автоматически создано при регистрации ${userInfo.firstName} ${userInfo.lastName}`,
              },
              { transaction }
            );

            console.log(
              `Создана обратная связь: ${reverseType} для пользователя ${relatedUserId}`
            );
          }
        }
      } catch (relationError) {
        console.error(
          `Ошибка при создании связи ${relationType}:`,
          relationError
        );
        // Продолжаем создание других связей
      }
    }

    // Если все прошло успешно, подтверждаем транзакцию
    await transaction.commit();

    // Загружаем созданные связи с деталями
    const userWithRelations = await User.findByPk(userInfo.id, {
      include: [
        {
          model: UserRelation,
          as: "relations",
          include: [
            {
              model: User,
              as: "relatedUser",
              attributes: ["id", "firstName", "lastName", "gender"],
            },
          ],
        },
      ],
    });

    console.log("Пользователь успешно добавлен с родственными связями");
    return res.status(201).json({
      user: userInfo,
      relations: userWithRelations.relations,
    });
  } catch (error) {
    // Откатываем транзакцию в случае ошибки
    await transaction.rollback();
    console.error("Ошибка при создании пользователя:", error);
    res.status(500).json({ error: "Ошибка при создании пользователя" });
  }
});

// API для получения инфы по отдельному пользователю
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "hebrewDate",
        "age",
        "mobileNumber",
        "email",
        "gender",
        "address",
        "religiousInfo",
        "notes",
      ],
      include: [
        {
          model: UserRelation,
          as: "relations",
          include: [
            {
              model: User,
              as: "relatedUser",
              attributes: ["id", "firstName", "lastName", "gender"],
            },
          ],
        },
      ],
    });

    if (user) {
      return res.json(user);
    } else {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    return res.status(500).json({ error: "Ошибка при поиске пользователя" });
  }
});

// API для изменения инфы по отдельному пользователю
router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      firstName,
      lastName,
      fatherName,
      birthDate,
      mobileNumber,
      email,
      gender,
      address,
      religiousInfo,
      notes,
    } = req.body;

    // Найдите пользователя по id
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Подготовка данных для обновления
    const updateData = {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      fatherName: fatherName || user.fatherName,
      mobileNumber: mobileNumber || user.mobileNumber,
      email: email || user.email,
      gender: gender || user.gender,
      address: address || user.address,
      religiousInfo: religiousInfo || user.religiousInfo,
      notes: notes !== undefined ? notes : user.notes,
    };

    // Если изменилась дата рождения, пересчитываем возраст и еврейскую дату
    if (birthDate && birthDate !== user.birthDate) {
      updateData.birthDate = birthDate;

      // Пересчет возраста
      updateData.age = calculateAge(birthDate);

      // Преобразование даты рождения в еврейскую дату
      const date = new Date(birthDate);
      const hebrewDate = new Hebcal.HDate(date);
      updateData.hebrewDate = hebrewDate.toString();
    }

    // Обновите данные пользователя
    await user.update(updateData);

    // Отправьте обновленные данные пользователя в ответе
    res.json(user);
  } catch (error) {
    console.error("Ошибка при обновлении пользователя:", error);
    res.status(500).json({ error: "Ошибка при обновлении пользователя" });
  }
});

// API для удаления пользователя
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Найдите пользователя по id
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Удалите пользователя (связи удалятся автоматически благодаря CASCADE)
    await user.destroy();

    // Отправьте подтверждение удаления
    res.json({ message: "Пользователь успешно удален" });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({ error: "Ошибка при удалении пользователя" });
  }
});

module.exports = router;
