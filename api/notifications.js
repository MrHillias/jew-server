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
