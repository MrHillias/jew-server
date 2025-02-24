const cron = require("node-cron");
const { checkUpcomingBarMitzvahs } = require("./notificationService");

// Функция для настройки планировщика
function setupScheduler() {
  // Планирование задачи
  //0 — минута (0-я минута часа), 0 — час (0-й час дня, то есть полночь)
  //* — день месяца (каждый день), * — месяц (каждый месяц)
  //* — день недели (каждый день недели)
  cron.schedule("30 11 * * *", () => {
    console.log("Запуск проверки базы данных в полночь");
    checkUpcomingBarMitzvahs();
  });
}

// Экспорт функции настройки планировщика
module.exports = setupScheduler;
