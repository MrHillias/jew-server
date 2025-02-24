const express = require("express");
const User = require("../models");

const router = express.Router();

// API для получения всех строк по выбранным колонкам
router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
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
      ], // Указываем нужные поля
      order: [["id", "ASC"]], // Сортировка по id в порядке возрастания
    });

    // Отправка данных клиенту
    res.json(users);
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
});

module.exports = router;
