const express = require("express");
const { Op } = require("sequelize");
const Hebcal = require("hebcal");

const sequelize = require("../db");
const router = express.Router();

// Используем ленивую загрузку моделей, чтобы избежать проблем с циклическими зависимостями
let User, UserRelation, RelationType;

// Инициализация моделей при первом использовании
const initModels = () => {
  if (!User) {
    const associations = require("../associations");
    User = associations.User;
    UserRelation = associations.UserRelation;
    RelationType = associations.RelationType;
  }
};

// Инициализация типов родственных связей
const initRelationTypes = async () => {
  initModels();

  const types = [
    {
      type: "father",
      nameRu: "Отец",
      nameHe: "אבא",
      reverseType: "child",
      genderSpecific: true,
    },
    {
      type: "mother",
      nameRu: "Мать",
      nameHe: "אמא",
      reverseType: "child",
      genderSpecific: true,
    },
    {
      type: "son",
      nameRu: "Сын",
      nameHe: "בן",
      reverseType: "parent",
      genderSpecific: true,
    },
    {
      type: "daughter",
      nameRu: "Дочь",
      nameHe: "בת",
      reverseType: "parent",
      genderSpecific: true,
    },
    {
      type: "husband",
      nameRu: "Муж",
      nameHe: "בעל",
      reverseType: "wife",
      genderSpecific: true,
    },
    {
      type: "wife",
      nameRu: "Жена",
      nameHe: "אישה",
      reverseType: "husband",
      genderSpecific: true,
    },
    {
      type: "brother",
      nameRu: "Брат",
      nameHe: "אח",
      reverseType: "sibling",
      genderSpecific: true,
    },
    {
      type: "sister",
      nameRu: "Сестра",
      nameHe: "אחות",
      reverseType: "sibling",
      genderSpecific: true,
    },
    {
      type: "grandfather",
      nameRu: "Дедушка",
      nameHe: "סבא",
      reverseType: "grandchild",
      genderSpecific: true,
    },
    {
      type: "grandmother",
      nameRu: "Бабушка",
      nameHe: "סבתא",
      reverseType: "grandchild",
      genderSpecific: true,
    },
    {
      type: "grandson",
      nameRu: "Внук",
      nameHe: "נכד",
      reverseType: "grandparent",
      genderSpecific: true,
    },
    {
      type: "granddaughter",
      nameRu: "Внучка",
      nameHe: "נכדה",
      reverseType: "grandparent",
      genderSpecific: true,
    },
    {
      type: "uncle",
      nameRu: "Дядя",
      nameHe: "דוד",
      reverseType: "nephew",
      genderSpecific: true,
    },
    {
      type: "aunt",
      nameRu: "Тётя",
      nameHe: "דודה",
      reverseType: "niece",
      genderSpecific: true,
    },
    {
      type: "nephew",
      nameRu: "Племянник",
      nameHe: "אחיין",
      reverseType: "uncle",
      genderSpecific: true,
    },
    {
      type: "niece",
      nameRu: "Племянница",
      nameHe: "אחיינית",
      reverseType: "aunt",
      genderSpecific: true,
    },
    {
      type: "cousin_male",
      nameRu: "Двоюродный брат",
      nameHe: "בן דוד",
      reverseType: "cousin",
      genderSpecific: true,
    },
    {
      type: "cousin_female",
      nameRu: "Двоюродная сестра",
      nameHe: "בת דודה",
      reverseType: "cousin",
      genderSpecific: true,
    },
  ];

  for (const type of types) {
    await RelationType.findOrCreate({
      where: { type: type.type },
      defaults: type,
    });
  }
};

// Вызов инициализации при запуске (отложенный)
setTimeout(() => {
  initRelationTypes().catch(console.error);
}, 1000);

// GET - Получить все типы родственных связей
router.get("/types", async (req, res) => {
  try {
    initModels();
    const types = await RelationType.findAll({
      order: [["nameRu", "ASC"]],
    });
    res.json(types);
  } catch (error) {
    console.error("Ошибка при получении типов связей:", error);
    res.status(500).json({ error: "Ошибка при получении типов связей" });
  }
});

// POST - Добавить родственную связь
router.post("/", async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    initModels();
    const {
      userId,
      relatedUserId,
      relationType,
      relatedPersonInfo,
      notes,
      createReverse = true,
      checkDuplicates = true, // Новый параметр для проверки дубликатов
    } = req.body;

    // Проверка существования пользователя
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Если указан relatedUserId, проверяем его существование
    if (relatedUserId) {
      const relatedUser = await User.findByPk(relatedUserId, { transaction });
      if (!relatedUser) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ error: "Связанный пользователь не найден" });
      }
    }

    // Если добавляется внешний родственник, проверяем возможные дубликаты
    let possibleMatches = [];
    if (!relatedUserId && relatedPersonInfo && checkDuplicates) {
      possibleMatches = await findPossibleMatches(
        relatedPersonInfo,
        transaction
      );

      if (possibleMatches.length > 0) {
        // Если найдены возможные совпадения, возвращаем их пользователю
        await transaction.rollback();

        return res.status(409).json({
          error: "Найдены возможные совпадения",
          message:
            "В базе уже есть внешние родственники с похожими данными. Возможно, это тот же человек?",
          possibleMatches: possibleMatches.map((match) => ({
            relationId: match.id,
            userId: match.userId,
            userName: `${match.user.firstName} ${match.user.lastName}`,
            relationType: match.relationType,
            personInfo: match.relatedPersonInfo,
            suggestion: `${match.user.firstName} ${match.user.lastName} уже имеет ${match.relationType} с такими данными`,
          })),
          hint: "Используйте endpoint POST /api/relations/link-external для связывания с существующей записью",
        });
      }
    }

    // Создание связи
    const relation = await UserRelation.create(
      {
        userId,
        relatedUserId,
        relationType,
        relatedPersonInfo: relatedUserId ? null : relatedPersonInfo,
        notes,
      },
      { transaction }
    );

    // Создание обратной связи, если нужно
    if (createReverse && relatedUserId) {
      const typeInfo = await RelationType.findOne({
        where: { type: relationType },
      });

      if (typeInfo && typeInfo.reverseType) {
        // Получаем информацию о связанном пользователе для определения его пола
        const relatedUser = await User.findByPk(relatedUserId);

        if (!relatedUser) {
          console.error(`Связанный пользователь ${relatedUserId} не найден`);
        } else {
          // Определяем тип обратной связи с учетом пола СВЯЗАННОГО пользователя
          let reverseType = typeInfo.reverseType;

          // Если тип зависит от пола, корректируем его на основе пола СВЯЗАННОГО пользователя
          if (typeInfo.genderSpecific) {
            const relatedUserGender = relatedUser.gender;

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
                reverseType =
                  relatedUserGender === "М" ? "grandson" : "granddaughter";
                break;
              case "grandparent":
                reverseType =
                  relatedUserGender === "М" ? "grandfather" : "grandmother";
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

          await UserRelation.create({
            userId: relatedUserId,
            relatedUserId: userId,
            relationType: reverseType,
            notes: `Автоматически создано как обратная связь`,
          });

          console.log(
            `Создана обратная связь: пользователь ${relatedUserId} теперь имеет связь '${reverseType}' с пользователем ${userId}`
          );
        }
      }
    }

    await transaction.commit();
    res.status(201).json(relation);
  } catch (error) {
    console.error("Ошибка при создании связи:", error);
    res.status(500).json({ error: "Ошибка при создании связи" });
  }
});

// GET - Получить все родственные связи пользователя
router.get("/user/:userId", async (req, res) => {
  try {
    initModels();
    const { userId } = req.params;
    const { includeDetails = true } = req.query;

    const relations = await UserRelation.findAll({
      where: { userId },
      include: includeDetails
        ? [
            {
              model: User,
              as: "relatedUser",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "fatherName",
                "birthDate",
                "hebrewDate",
                "gender",
                "mobileNumber",
                "email",
              ],
            },
          ]
        : [],
      order: [["relationType", "ASC"]],
    });

    res.json(relations);
  } catch (error) {
    console.error("Ошибка при получении связей:", error);
    res.status(500).json({ error: "Ошибка при получении связей" });
  }
});

// POST - Связать внешнего родственника с существующим пользователем
router.post("/link-external", async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      relationId, // ID существующей связи с внешним родственником
      newUserId, // ID пользователя в базе, который является этим родственником
      createReverse = true,
    } = req.body;

    // Находим существующую связь
    const existingRelation = await UserRelation.findByPk(relationId, {
      include: [
        {
          model: User,
          as: "user",
        },
      ],
      transaction,
    });

    if (!existingRelation) {
      await transaction.rollback();
      return res.status(404).json({ error: "Связь не найдена" });
    }

    if (existingRelation.relatedUserId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "Эта связь уже ссылается на пользователя в базе" });
    }

    // Проверяем существование нового пользователя
    const newUser = await User.findByPk(newUserId, { transaction });
    if (!newUser) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ error: "Указанный пользователь не найден" });
    }

    // Сохраняем старую информацию для логирования
    const oldPersonInfo = existingRelation.relatedPersonInfo;

    // Обновляем существующую связь
    await existingRelation.update(
      {
        relatedUserId: newUserId,
        relatedPersonInfo: null,
        notes:
          existingRelation.notes +
          `\nСвязан с пользователем ID ${newUserId} (${new Date().toISOString()})`,
      },
      { transaction }
    );

    // Создаем обратную связь, если нужно
    if (createReverse) {
      const relationType = existingRelation.relationType;
      const typeInfo = await RelationType.findOne({
        where: { type: relationType },
        transaction,
      });

      if (typeInfo && typeInfo.reverseType) {
        // Определяем обратный тип связи на основе пола нового пользователя
        let reverseType = typeInfo.reverseType;

        if (typeInfo.genderSpecific) {
          const newUserGender = newUser.gender;

          switch (typeInfo.reverseType) {
            case "child":
              reverseType = newUserGender === "М" ? "son" : "daughter";
              break;
            case "parent":
              reverseType = newUserGender === "М" ? "father" : "mother";
              break;
            case "sibling":
              reverseType = newUserGender === "М" ? "brother" : "sister";
              break;
            case "grandchild":
              reverseType =
                newUserGender === "М" ? "grandson" : "granddaughter";
              break;
            case "grandparent":
              reverseType =
                newUserGender === "М" ? "grandfather" : "grandmother";
              break;
            case "nephew":
            case "niece":
              reverseType = newUserGender === "М" ? "uncle" : "aunt";
              break;
            case "uncle":
            case "aunt":
              reverseType = newUserGender === "М" ? "nephew" : "niece";
              break;
            case "cousin":
              reverseType =
                newUserGender === "М" ? "cousin_male" : "cousin_female";
              break;
          }
        }

        // Проверяем, нет ли уже такой связи
        const existingReverseRelation = await UserRelation.findOne({
          where: {
            userId: newUserId,
            relatedUserId: existingRelation.userId,
          },
          transaction,
        });

        if (!existingReverseRelation) {
          await UserRelation.create(
            {
              userId: newUserId,
              relatedUserId: existingRelation.userId,
              relationType: reverseType,
              notes: `Автоматически создано при связывании с существующим пользователем`,
            },
            { transaction }
          );

          console.log(
            `Создана обратная связь: ${reverseType} для пользователя ${newUserId}`
          );
        }
      }
    }

    await transaction.commit();

    // Загружаем обновленную связь с информацией о пользователе
    const updatedRelation = await UserRelation.findByPk(relationId, {
      include: [
        {
          model: User,
          as: "relatedUser",
          attributes: ["id", "firstName", "lastName", "gender", "birthDate"],
        },
      ],
    });

    res.json({
      message: "Родственник успешно связан с пользователем",
      relation: updatedRelation,
      previousInfo: oldPersonInfo,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при связывании родственника:", error);
    res.status(500).json({ error: "Ошибка при связывании родственника" });
  }
});

// GET - Поиск внешних родственников для возможного связывания
router.get("/external-relatives", async (req, res) => {
  try {
    const { firstName, lastName, onlyUnlinked = true } = req.query;

    const where = {
      relatedUserId: null, // Только внешние родственники
      relatedPersonInfo: {
        [Op.not]: null,
      },
    };

    // Поиск по имени и фамилии в JSON поле
    const conditions = [];

    if (firstName) {
      conditions.push(
        sequelize.where(sequelize.json("relatedPersonInfo.firstName"), {
          [Op.iLike]: `%${firstName}%`,
        })
      );
    }

    if (lastName) {
      conditions.push(
        sequelize.where(sequelize.json("relatedPersonInfo.lastName"), {
          [Op.iLike]: `%${lastName}%`,
        })
      );
    }

    if (conditions.length > 0) {
      where[Op.and] = conditions;
    }

    const externalRelatives = await UserRelation.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    // Форматируем ответ для удобства
    const formattedResults = externalRelatives.map((rel) => ({
      relationId: rel.id,
      userId: rel.userId,
      userName: `${rel.user.firstName} ${rel.user.lastName}`,
      relationType: rel.relationType,
      externalPerson: rel.relatedPersonInfo,
      notes: rel.notes,
    }));

    res.json({
      count: formattedResults.length,
      relatives: formattedResults,
    });
  } catch (error) {
    console.error("Ошибка при поиске внешних родственников:", error);
    res.status(500).json({ error: "Ошибка при поиске внешних родственников" });
  }
});

// Функция для поиска возможных совпадений среди внешних родственников
async function findPossibleMatches(personInfo, transaction = null) {
  if (!personInfo || !personInfo.firstName || !personInfo.lastName) {
    return [];
  }

  const conditions = [
    { relatedUserId: null },
    { relatedPersonInfo: { [Op.not]: null } },
  ];

  // Точное совпадение по имени и фамилии
  const exactMatchConditions = [
    sequelize.where(
      sequelize.fn("LOWER", sequelize.json("relatedPersonInfo.firstName")),
      sequelize.fn("LOWER", personInfo.firstName)
    ),
    sequelize.where(
      sequelize.fn("LOWER", sequelize.json("relatedPersonInfo.lastName")),
      sequelize.fn("LOWER", personInfo.lastName)
    ),
  ];

  // Если есть дата рождения, добавляем её в условия
  if (personInfo.birthDate) {
    exactMatchConditions.push(
      sequelize.where(
        sequelize.json("relatedPersonInfo.birthDate"),
        personInfo.birthDate
      )
    );
  }

  conditions.push({ [Op.and]: exactMatchConditions });

  const matches = await UserRelation.findAll({
    where: { [Op.and]: conditions },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
    transaction,
  });

  return matches;
}

// GET - Получить семейное дерево пользователя
router.get("/tree/:userId", async (req, res) => {
  try {
    initModels();
    const { userId } = req.params;
    const { depth = 2 } = req.query; // Глубина дерева

    const buildFamilyTree = async (
      id,
      currentDepth = 0,
      visited = new Set()
    ) => {
      if (currentDepth >= depth || visited.has(id)) {
        return null;
      }

      visited.add(id);

      const user = await User.findByPk(id, {
        attributes: [
          "id",
          "firstName",
          "lastName",
          "fatherName",
          "birthDate",
          "gender",
        ],
      });

      if (!user) return null;

      const relations = await UserRelation.findAll({
        where: { userId: id },
        include: [
          {
            model: User,
            as: "relatedUser",
            attributes: ["id", "firstName", "lastName", "gender"],
          },
        ],
      });

      const familyMembers = {};

      for (const relation of relations) {
        const relationType = relation.relationType;
        if (!familyMembers[relationType]) {
          familyMembers[relationType] = [];
        }

        if (relation.relatedUserId && relation.relatedUser) {
          const member = {
            id: relation.relatedUser.id,
            firstName: relation.relatedUser.firstName,
            lastName: relation.relatedUser.lastName,
            gender: relation.relatedUser.gender,
            relationType: relationType,
          };

          if (currentDepth < depth - 1) {
            member.relations = await buildFamilyTree(
              relation.relatedUserId,
              currentDepth + 1,
              visited
            );
          }

          familyMembers[relationType].push(member);
        } else if (relation.relatedPersonInfo) {
          familyMembers[relationType].push({
            ...relation.relatedPersonInfo,
            relationType: relationType,
            notInDatabase: true,
          });
        }
      }

      return {
        ...user.toJSON(),
        relations: familyMembers,
      };
    };

    const tree = await buildFamilyTree(parseInt(userId));
    res.json(tree);
  } catch (error) {
    console.error("Ошибка при построении семейного дерева:", error);
    res.status(500).json({ error: "Ошибка при построении семейного дерева" });
  }
});

// PUT - Обновить родственную связь
router.put("/:id", async (req, res) => {
  try {
    initModels();
    const { id } = req.params;
    const { relationType, relatedPersonInfo, notes } = req.body;

    const relation = await UserRelation.findByPk(id);
    if (!relation) {
      return res.status(404).json({ error: "Связь не найдена" });
    }

    await relation.update({
      relationType: relationType || relation.relationType,
      relatedPersonInfo: relatedPersonInfo || relation.relatedPersonInfo,
      notes: notes !== undefined ? notes : relation.notes,
    });

    res.json(relation);
  } catch (error) {
    console.error("Ошибка при обновлении связи:", error);
    res.status(500).json({ error: "Ошибка при обновлении связи" });
  }
});

// DELETE - Удалить родственную связь
router.delete("/:id", async (req, res) => {
  try {
    initModels();
    const { id } = req.params;
    const { deleteReverse = true } = req.query;

    const relation = await UserRelation.findByPk(id);
    if (!relation) {
      return res.status(404).json({ error: "Связь не найдена" });
    }

    // Если нужно удалить обратную связь
    if (deleteReverse && relation.relatedUserId) {
      const typeInfo = await RelationType.findOne({
        where: { type: relation.relationType },
      });

      if (typeInfo && typeInfo.reverseType) {
        await UserRelation.destroy({
          where: {
            userId: relation.relatedUserId,
            relatedUserId: relation.userId,
          },
        });
      }
    }

    await relation.destroy();
    res.json({ message: "Связь успешно удалена" });
  } catch (error) {
    console.error("Ошибка при удалении связи:", error);
    res.status(500).json({ error: "Ошибка при удалении связи" });
  }
});

// POST - Поиск возможных родственников
router.post("/search", async (req, res) => {
  try {
    initModels();
    const { firstName, lastName, birthDate } = req.body;

    const where = {};
    if (firstName) {
      where.firstName = { [Op.iLike]: `%${firstName}%` };
    }
    if (lastName) {
      where.lastName = { [Op.iLike]: `%${lastName}%` };
    }
    if (birthDate) {
      const date = new Date(birthDate);
      const startDate = new Date(
        date.getFullYear() - 2,
        date.getMonth(),
        date.getDate()
      );
      const endDate = new Date(
        date.getFullYear() + 2,
        date.getMonth(),
        date.getDate()
      );
      where.birthDate = { [Op.between]: [startDate, endDate] };
    }

    const users = await User.findAll({
      where,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "age",
        "gender",
      ],
      limit: 20,
    });

    res.json(users);
  } catch (error) {
    console.error("Ошибка при поиске:", error);
    res.status(500).json({ error: "Ошибка при поиске" });
  }
});

module.exports = router;
