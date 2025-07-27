const express = require("express");
const { User, UserRelation, RelationType } = require("../associations");
const Hebcal = require("hebcal");
const { Op } = require("sequelize");
const sequelize = require("../db");

const router = express.Router();

const calculateAge = require("../ageCalculator");

// Функция для определения обратного типа связи с учетом пола
async function getReverseRelationType(relationType, relatedUserGender) {
  const typeInfo = await RelationType.findOne({
    where: { type: relationType },
  });

  if (!typeInfo || !typeInfo.reverseType) {
    return null;
  }

  let reverseType = typeInfo.reverseType;

  // Корректируем тип в зависимости от пола СВЯЗАННОГО пользователя
  if (typeInfo.genderSpecific) {
    switch (typeInfo.reverseType) {
      case "child":
        reverseType = relatedUserGender === "М" ? "son" : "daughter";
        break;
      case "parent":
        reverseType = relatedUserGender === "М" ? "father" : "mother";
        break;
      case "sibling":
        reverseType = relatedUserGender === "М" ? "brother" : "sister";
        break;
      case "grandchild":
        reverseType = relatedUserGender === "М" ? "grandson" : "granddaughter";
        break;
      case "grandparent":
        reverseType = relatedUserGender === "М" ? "grandfather" : "grandmother";
        break;
      case "nephew":
      case "niece":
        reverseType = relatedUserGender === "М" ? "uncle" : "aunt";
        break;
      case "uncle":
      case "aunt":
        reverseType = relatedUserGender === "М" ? "nephew" : "niece";
        break;
      case "cousin":
        reverseType =
          relatedUserGender === "М" ? "cousin_male" : "cousin_female";
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
        lastName: lastName || null,
        fatherName: fatherName || null,
        birthDate: birthDate || null,
        hebrewDate: hebrewDateString || null,
        age: age || null,
        mobileNumber: mobileNumber || null,
        email: email || null,
        gender: gender || null,
        address: address || null,
        religiousInfo: religiousInfo || null,
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
          // Получаем информацию о связанном пользователе
          const relatedUser = await User.findByPk(relatedUserId, {
            transaction,
          });

          if (relatedUser) {
            const reverseType = await getReverseRelationType(
              relationType,
              relatedUser.gender
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

    const completeUser = await User.findByPk(userInfo.id, {
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
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: UserRelation,
          as: "relations",
          include: [
            {
              model: User,
              as: "relatedUser",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "gender",
                "birthDate",
                "age",
              ],
            },
          ],
        },
      ],
    });

    console.log("Пользователь успешно добавлен с родственными связями");

    const userResponse = completeUser.toJSON();
    delete userResponse.relations; // Убираем вложенные связи из основного объекта

    return res.status(201).json({
      ...userResponse,
      relations: completeUser.relations || [],
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

// API для удаления пользователя с сохранением родственных связей
router.delete("/:id", async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.params.id;

    // Найдите пользователя по id
    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserRelation,
          as: "relations",
        },
      ],
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Сохраняем информацию о пользователе для родственных связей
    const userInfo = {
      firstName: user.firstName,
      lastName: user.lastName,
      fatherName: user.fatherName,
      birthDate: user.birthDate,
      hebrewDate: user.hebrewDate,
      gender: user.gender,
      mobileNumber: user.mobileNumber,
      email: user.email,
      isDeceased: false, // Можно добавить параметр в запрос
      notes: `Удален из базы ${new Date().toISOString()}`,
    };

    // Обновляем все связи, где этот пользователь указан как relatedUserId
    const relationsToUpdate = await UserRelation.findAll({
      where: { relatedUserId: userId },
      transaction,
    });

    console.log(`Найдено ${relationsToUpdate.length} связей для обновления`);

    for (const relation of relationsToUpdate) {
      await relation.update(
        {
          relatedUserId: null,
          relatedPersonInfo: userInfo,
        },
        { transaction }
      );

      console.log(
        `Обновлена связь ${relation.id}: пользователь ${relation.userId} теперь имеет внешнюю связь`
      );
    }

    // Удаляем пользователя (его собственные связи удалятся автоматически)
    await user.destroy({ transaction });

    await transaction.commit();

    res.json({
      message: "Пользователь успешно удален",
      updatedRelations: relationsToUpdate.length,
      preservedUserInfo: userInfo,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({ error: "Ошибка при удалении пользователя" });
  }
});

module.exports = router;
