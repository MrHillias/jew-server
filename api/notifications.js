const express = require("express");
const Notifications = require("../models_notification");
const { User } = require("../associations"); // Эта строка критически важна!
const { Op } = require("sequelize");
const sequelize = require("../db_notifications");

const router = express.Router();

// GET-метод для получения всех уведомлений
router.get("/", async (req, res) => {
  try {
    const notifications = await Notifications.findAll();
    res.json(notifications);
  } catch (error) {
    console.error("Ошибка при получении уведомлений:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET-метод для получения уведомлений с фильтрацией
router.get("/filtered", async (req, res) => {
  try {
    const { type, status, userId } = req.query;

    const where = {};

    // Фильтрация по типу
    if (type) {
      // Если нужны все уведомления о днях рождения
      if (type === "birthday") {
        where.type = {
          [Op.or]: [
            "birthday-today",
            "birthday-tomorrow",
            "birthday-week",
            "birthday-month",
            "hebrew-birthday-today",
            "hebrew-birthday-tomorrow",
            "hebrew-birthday-week",
          ],
        };
      } else {
        where.type = type;
      }
    }

    // Фильтрация по статусу
    if (status) {
      where.status = status;
    }

    // Фильтрация по пользователю
    if (userId) {
      where.userId = userId;
    }

    const notifications = await Notifications.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 100, // Ограничение количества
    });

    res.json(notifications);
  } catch (error) {
    console.error("Ошибка при получении уведомлений:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET-метод для получения сегодняшних именинников
router.get("/birthdays/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = await Notifications.findAll({
      where: {
        type: {
          [Op.in]: ["birthday-today", "hebrew-birthday-today"],
        },
        createdAt: {
          [Op.gte]: today,
        },
      },
      order: [["createdAt", "DESC"]],
    });

    res.json(notifications);
  } catch (error) {
    console.error("Ошибка при получении именинников:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET-метод для получения предстоящих дней рождения
router.get("/birthdays/upcoming", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = await Notifications.findAll({
      where: {
        type: {
          [Op.in]: [
            "birthday-tomorrow",
            "birthday-week",
            "birthday-month",
            "hebrew-birthday-tomorrow",
            "hebrew-birthday-week",
          ],
        },
        createdAt: {
          [Op.gte]: today,
        },
        status: "unread",
      },
      order: [
        [
          sequelize.literal(`
          CASE 
            WHEN type IN ('birthday-tomorrow', 'hebrew-birthday-tomorrow') THEN 1
            WHEN type IN ('birthday-week', 'hebrew-birthday-week') THEN 2
            WHEN type = 'birthday-month' THEN 3
            ELSE 4
          END
        `),
        ],
        ["createdAt", "DESC"],
      ],
    });

    res.json(notifications);
  } catch (error) {
    console.error("Ошибка при получении предстоящих дней рождения:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE-метод для удаления уведомления по ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notifications.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: "Уведомление не найдено" });
    }
    await notification.destroy();
    res.json({ message: "Уведомление успешно удалено" });
  } catch (error) {
    console.error("Ошибка при удалении уведомления:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PUT-метод для обновления уведомления по ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Предполагается, что эти поля могут быть обновлены

  try {
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: "Уведомление не найдено" });
    }

    // Обновление полей уведомления
    await notification.update({
      status: status || notification.status,
    });

    res.json({ message: "Уведомление успешно обновлено", notification });
  } catch (error) {
    console.error("Ошибка при обновлении уведомления:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST - Создание тестового уведомления
router.post("/test", async (req, res) => {
  try {
    const {
      userId,
      type = "test",
      message,
      firstName,
      lastName,
      status = "unread",
      customType,
    } = req.body;

    // Предустановленные типы тестовых уведомлений
    const testNotificationTypes = {
      birthdayToday: {
        type: "birthday-today",
        messageTemplate: "Сегодня день рождения! Исполняется {age} лет",
      },
      birthdayTomorrow: {
        type: "birthday-tomorrow",
        messageTemplate: "День рождения завтра! Исполнится {age} лет",
      },
      birthdayWeek: {
        type: "birthday-week",
        messageTemplate: "День рождения через неделю! Исполнится {age} лет",
      },
      birthdayMonth: {
        type: "birthday-month",
        messageTemplate: "День рождения через месяц! Исполнится {age} лет",
      },
      hebrewBirthdayToday: {
        type: "hebrew-birthday-today",
        messageTemplate: "Сегодня еврейский день рождения! (тест)",
      },
      barMitzvah: {
        type: "bar-mitzvah",
        messageTemplate: "Бар-мицва через 180 дней! (тестовое уведомление)",
      },
      batMitzvah: {
        type: "bat-mitzvah",
        messageTemplate: "Бат-мицва через 180 дней! (тестовое уведомление)",
      },
      halake: {
        type: "halake",
        messageTemplate: "Халаке через 2 недели! (тестовое уведомление)",
      },
      custom: {
        type: customType || "test-notification",
        messageTemplate: message || "Тестовое уведомление",
      },
    };

    // Если userId не указан, создаем уведомление для тестового пользователя
    let targetUserId = userId;
    let userFirstName = firstName;
    let userLastName = lastName;

    if (!targetUserId) {
      // Ищем любого пользователя для теста
      const testUser = await User.findOne({
        order: [["id", "ASC"]],
      });

      if (testUser) {
        targetUserId = testUser.id;
        userFirstName = userFirstName || testUser.firstName;
        userLastName = userLastName || testUser.lastName;
      } else {
        return res.status(400).json({
          error:
            "Не найдено пользователей в базе. Создайте хотя бы одного пользователя или укажите userId.",
        });
      }
    } else {
      // Проверяем существование указанного пользователя
      const user = await User.findByPk(targetUserId);
      if (!user) {
        return res
          .status(404)
          .json({ error: "Пользователь с указанным ID не найден" });
      }
      userFirstName = userFirstName || user.firstName;
      userLastName = userLastName || user.lastName;
    }

    // Выбираем тип уведомления
    const notificationType =
      testNotificationTypes[type] || testNotificationTypes.custom;

    // Подготавливаем сообщение
    let finalMessage = notificationType.messageTemplate;

    // Заменяем плейсхолдеры в сообщении
    if (type.includes("birthday") && finalMessage.includes("{age}")) {
      const randomAge = Math.floor(Math.random() * 50) + 18; // Случайный возраст от 18 до 67
      finalMessage = finalMessage.replace("{age}", randomAge);
    }

    // Создаем тестовое уведомление
    const notification = await Notifications.create({
      userId: targetUserId,
      firstName: userFirstName || "Тестовый",
      lastName: userLastName || "Пользователь",
      message: finalMessage,
      type: notificationType.type,
      status: status,
    });

    console.log(
      `Создано тестовое уведомление: ${notificationType.type} для пользователя ${targetUserId}`
    );

    res.status(201).json({
      message: "Тестовое уведомление успешно создано",
      notification: notification,
    });
  } catch (error) {
    console.error("Ошибка при создании тестового уведомления:", error);
    res
      .status(500)
      .json({ error: "Ошибка при создании тестового уведомления" });
  }
});

// POST - Создание множественных тестовых уведомлений
router.post("/test/bulk", async (req, res) => {
  try {
    const {
      count = 5,
      types = [
        "birthdayToday",
        "birthdayTomorrow",
        "birthdayWeek",
        "barMitzvah",
        "custom",
      ],
    } = req.body;

    // Получаем случайных пользователей
    const users = await User.findAll({
      order: sequelize.random(),
      limit: Math.min(count, 20), // Максимум 20 уведомлений за раз
    });

    if (users.length === 0) {
      return res.status(400).json({
        error:
          "Не найдено пользователей в базе. Создайте пользователей перед тестированием.",
      });
    }

    const notifications = [];
    const notificationTypes = [
      {
        type: "birthday-today",
        message: "Сегодня день рождения! Исполняется 30 лет",
      },
      {
        type: "birthday-tomorrow",
        message: "День рождения завтра! Исполнится 25 лет",
      },
      {
        type: "birthday-week",
        message: "День рождения через неделю! Исполнится 40 лет",
      },
      {
        type: "birthday-month",
        message: "День рождения через месяц! Исполнится 35 лет",
      },
      {
        type: "hebrew-birthday-today",
        message: "Сегодня еврейский день рождения!",
      },
      { type: "bar-mitzvah", message: "Бар-мицва через 180 дней!" },
      { type: "bat-mitzvah", message: "Бат-мицва через 180 дней!" },
      { type: "halake", message: "Халаке через 2 недели!" },
      {
        type: "test-notification",
        message: "Это тестовое уведомление для проверки системы",
      },
    ];

    for (let i = 0; i < Math.min(count, users.length); i++) {
      const user = users[i];
      const randomType =
        notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

      const notification = await Notifications.create({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        message: randomType.message,
        type: randomType.type,
        status: Math.random() > 0.7 ? "read" : "unread", // 70% непрочитанных
      });

      notifications.push(notification);
    }

    console.log(`Создано ${notifications.length} тестовых уведомлений`);

    res.status(201).json({
      message: `Успешно создано ${notifications.length} тестовых уведомлений`,
      count: notifications.length,
      notifications: notifications,
    });
  } catch (error) {
    console.error("Ошибка при создании тестовых уведомлений:", error);
    res.status(500).json({ error: "Ошибка при создании тестовых уведомлений" });
  }
});

// DELETE - Удаление всех тестовых уведомлений
router.delete("/test/cleanup", async (req, res) => {
  try {
    const testTypes = ["test-notification", "test", "custom"];

    const result = await Notifications.destroy({
      where: {
        [Op.or]: [
          { type: { [Op.in]: testTypes } },
          { message: { [Op.like]: "%тест%" } },
          { message: { [Op.like]: "%Тест%" } },
        ],
      },
    });

    console.log(`Удалено ${result} тестовых уведомлений`);

    res.json({
      message: `Успешно удалено ${result} тестовых уведомлений`,
      count: result,
    });
  } catch (error) {
    console.error("Ошибка при удалении тестовых уведомлений:", error);
    res.status(500).json({ error: "Ошибка при удалении тестовых уведомлений" });
  }
});

// GET - Получение статистики по уведомлениям
router.get("/stats", async (req, res) => {
  try {
    // Общее количество уведомлений
    const totalCount = await Notifications.count();

    // Количество по статусам
    const statusStats = await Notifications.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      group: ["status"],
    });

    // Количество по типам
    const typeStats = await Notifications.findAll({
      attributes: [
        "type",
        [sequelize.fn("COUNT", sequelize.col("type")), "count"],
      ],
      group: ["type"],
      order: [[sequelize.fn("COUNT", sequelize.col("type")), "DESC"]],
    });

    // Уведомления за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await Notifications.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });

    // Сегодняшние уведомления
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await Notifications.count({
      where: {
        createdAt: {
          [Op.gte]: today,
        },
      },
    });

    res.json({
      total: totalCount,
      todayCount: todayCount,
      recentCount: recentCount,
      byStatus: statusStats.map((s) => ({
        status: s.status,
        count: parseInt(s.dataValues.count),
      })),
      byType: typeStats.map((t) => ({
        type: t.type,
        count: parseInt(t.dataValues.count),
      })),
    });
  } catch (error) {
    console.error("Ошибка при получении статистики:", error);
    res.status(500).json({ error: "Ошибка при получении статистики" });
  }
});

module.exports = router;
