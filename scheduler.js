const cron = require("node-cron");
const {
  checkUpcomingBarMitzvahs,
  checkUpcomingBirthdays,
} = require("./notificationService");
const { recalculateAges } = require("./ageService");

// Функция для настройки планировщика
function setupScheduler() {
  // Планирование ежедневной задачи в 00:01
  cron.schedule("1 0 * * *", () => {
    console.log("Запуск ежедневных проверок...");

    // Проверка бар/бат-мицв
    console.log("Проверка предстоящих бар/бат-мицв...");
    checkUpcomingBarMitzvahs();

    // Пересчет возрастов
    console.log("Пересчет возрастов пользователей...");
    recalculateAges();

    // Проверка дней рождения
    console.log("Проверка предстоящих дней рождения...");
    checkUpcomingBirthdays();
  });

  // Дополнительная проверка дней рождения в 9:00 утра
  cron.schedule("0 9 * * *", () => {
    console.log("Утренняя проверка дней рождения...");
    checkUpcomingBirthdays();
  });

  console.log("Планировщик задач настроен");
}

// Экспорт функции настройки планировщика
module.exports = setupScheduler;
