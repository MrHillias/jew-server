const User = require("./models");
const Notifications = require("./models_notification");
const Hebcal = require("hebcal");

const { Op } = require("sequelize");

async function checkUpcomingBarMitzvahs() {
  try {
    // Получение сегодняшней даты и преобразование в еврейскую дату
    const today = new Date();
    const hebrewToday = new Hebcal.HDate(today);

    // Прибавление 180 дней
    hebrewToday.setDate(hebrewToday.getDate() + 180);

    // Вычитание 13 лет
    hebrewToday.setFullYear(hebrewToday.getFullYear() - 13);

    // Преобразование в строку
    const targetHebrewDateString = hebrewToday.toString();

    console.log("Мы ищем людей с др " + targetHebrewDateString);

    // Поиск пользователей с совпадающей еврейской датой
    const users = await User.findAll({
      where: {
        hebrewDate: targetHebrewDateString,
      },
    });

    // Создание оповещений для каждого пользователя
    for (const user of users) {
      await Notification.create({
        userId: user.id,
        message: `Бар-мицва через 180 дней!`,
        type: "bar-mitzvah",
        status: "unread",
      });
    }

    console.log(`Создано ${users.length} оповещений о бар-мицве.`);
  } catch (error) {
    console.error("Ошибка при проверке бар-мицв:", error);
  }
}

module.exports = { checkUpcomingBarMitzvahs };
