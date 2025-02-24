const cron = require("node-cron");
const express = require("express");
const User = require("../models");

// Функция для настройки планировщика
function setupScheduler() {
  // Планирование задачи
  //0 — минута (0-я минута часа), 0 — час (0-й час дня, то есть полночь)
  //* — день месяца (каждый день), * — месяц (каждый месяц)
  //* — день недели (каждый день недели)
  cron.schedule("0 10 * * *", () => {
    console.log("Запуск проверки базы данных в полночь");
  });
}

// Экспорт функции настройки планировщика
module.exports = setupScheduler;
