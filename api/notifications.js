const express = require("express");
const Notifications = require("../models_notification");

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

module.exports = router;
