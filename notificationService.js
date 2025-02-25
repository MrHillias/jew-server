const User = require("./models");
const Notifications = require("./models_notification");
const Hebcal = require("hebcal");

const { Op } = require("sequelize");

async function checkUpcomingBarMitzvahs() {
  try {
    // Получение сегодняшней даты и преобразование в еврейскую дату
    const today = new Date();
    const hebrewToday = new Hebcal.HDate(today);

    // Вычисление целевых дат для бар-мицвы, бат-мицвы и халаке
    const barMitzvahDate = new Hebcal.HDate(hebrewToday);
    barMitzvahDate.setDate(barMitzvahDate.getDate() + 180);
    barMitzvahDate.setFullYear(barMitzvahDate.getFullYear() - 13);

    const batMitzvahDate = new Hebcal.HDate(hebrewToday);
    batMitzvahDate.setDate(batMitzvahDate.getDate() + 180);
    batMitzvahDate.setFullYear(batMitzvahDate.getFullYear() - 12);

    const halakeDate = new Hebcal.HDate(hebrewToday);
    halakeDate.setDate(halakeDate.getDate() + 14);
    halakeDate.setFullYear(halakeDate.getFullYear() - 3);

    // Преобразование дат в строки
    const barMitzvahDateString = barMitzvahDate.toString();
    const batMitzvahDateString = batMitzvahDate.toString();
    const halakeDateString = halakeDate.toString();

    // Поиск пользователей для бар-мицвы
    const barMitzvahUsers = await User.findAll({
      where: {
        hebrewDate: barMitzvahDateString,
        gender: "М",
      },
    });

    // Поиск пользователей для бат-мицвы
    const batMitzvahUsers = await User.findAll({
      where: {
        hebrewDate: batMitzvahDateString,
        gender: "Ж",
      },
    });

    // Поиск пользователей для халаке
    const halakeUsers = await User.findAll({
      where: {
        hebrewDate: halakeDateString,
      },
    });

    // Создание оповещений для каждого пользователя
    for (const user of barMitzvahUsers) {
      await Notifications.create({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        message: `Бар-мицва через 180 дней!`,
        type: "bar-mitzvah",
        status: "unread",
      });
    }

    for (const user of batMitzvahUsers) {
      await Notifications.create({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        message: `Бат-мицва через 180 дней!`,
        type: "bat-mitzvah",
        status: "unread",
      });
    }

    for (const user of halakeUsers) {
      await Notifications.create({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        message: `Халаке через 2 недели!`,
        type: "halake",
        status: "unread",
      });
    }

    console.log(
      `Создано ${
        barMitzvahUsers.length + batMitzvahUsers.length + halakeUsers.length
      } оповещений о предстоящих празднованиях.`
    );
  } catch (error) {
    console.error("Ошибка при проверке бар-мицв:", error);
  }
}

module.exports = { checkUpcomingBarMitzvahs };
