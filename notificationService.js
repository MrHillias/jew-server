const User = require("./models");
const Notifications = require("./models_notification");

const { Op } = require("sequelize");

async function checkUpcomingBarMitzvahs() {
  try {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 180);

    // Поиск пользователей, у которых бар-мицва через 180 дней
    const users = await User.findAll({
      where: {
        barMitzvahDate: {
          [Op.eq]: targetDate,
        },
      },
    });

    // Создание оповещений для каждого пользователя
    for (const user of users) {
      await Notifications.create({
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
