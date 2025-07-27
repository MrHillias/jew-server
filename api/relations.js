const express = require("express");
const { Op } = require("sequelize");
const Hebcal = require("hebcal");

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
  try {
    initModels();
    const {
      userId,
      relatedUserId,
      relationType,
      relatedPersonInfo,
      notes,
      createReverse = true, // Создавать ли обратную связь
    } = req.body;

    // Проверка существования пользователя
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Если указан relatedUserId, проверяем его существование
    if (relatedUserId) {
      const relatedUser = await User.findByPk(relatedUserId);
      if (!relatedUser) {
        return res
          .status(404)
          .json({ error: "Связанный пользователь не найден" });
      }
    }

    // Создание связи
    const relation = await UserRelation.create({
      userId,
      relatedUserId,
      relationType,
      relatedPersonInfo: relatedUserId ? null : relatedPersonInfo,
      notes,
    });

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
