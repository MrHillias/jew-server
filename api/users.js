const express = require("express");
const User = require("../models");

const router = express.Router();

// API для получения всех строк по выбранным колонкам
router.get("/users", async (req, res) => {
  try {
    console.log(User);
    const users = await User.findAll({
      attributes: [
        "id",
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "mobileNumber",
        "email",
        "gender",
        "address",
        "religiousInfo",
      ], // Указываем нужные поля
    });

    // Отправка данных клиенту
    res.json(users);
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
});

module.exports = router;
