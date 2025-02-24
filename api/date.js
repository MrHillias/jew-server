const express = require("express");
const router = express.Router();
const Hebcal = require("hebcal");

// API для получения григорианской и еврейской дат
router.get("/", async (req, res) => {
  try {
    // Получение сегодняшней григорианской даты
    const todayGregorian = new Date();

    // Преобразование в еврейскую дату
    const hebrewDate = new Hebcal.HDate(todayGregorian);
    const todayHebrew = hebrewDate.toString(); // Преобразование в строку

    // Формирование ответа
    const response = {
      gregorianDate: todayGregorian.toISOString().split("T")[0], // Формат YYYY-MM-DD
      hebrewDate: todayHebrew,
    };

    // Отправка ответа
    res.json(response);
  } catch (error) {
    console.error("Ошибка при отправке дат:", error);
    res.status(500).send("Ошибка при отправке дат");
  }
});

module.exports = router;
