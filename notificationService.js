const { User } = require("./models");
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

// Новая функция для проверки дней рождения
async function checkUpcomingBirthdays() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Проверяем дни рождения на сегодня, завтра и через неделю
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    // Функция для получения даты без года
    const getMonthDay = (date) => {
      return `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    };

    // Проверка по григорианскому календарю
    const todayMonthDay = getMonthDay(today);
    const tomorrowMonthDay = getMonthDay(tomorrow);
    const nextWeekMonthDay = getMonthDay(nextWeek);
    const nextMonthMonthDay = getMonthDay(nextMonth);

    // Находим всех пользователей с днями рождения
    const allUsers = await User.findAll({
      where: {
        birthDate: {
          [Op.not]: null,
        },
      },
    });

    for (const user of allUsers) {
      const birthDate = new Date(user.birthDate);
      const userMonthDay = getMonthDay(birthDate);

      let notification = null;

      // Проверяем совпадения дат
      if (userMonthDay === todayMonthDay) {
        // День рождения сегодня
        const age = today.getFullYear() - birthDate.getFullYear();
        notification = {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          message: `Сегодня день рождения! Исполняется ${age} лет`,
          type: "birthday-today",
          status: "unread",
        };
      } else if (userMonthDay === tomorrowMonthDay) {
        // День рождения завтра
        const age = today.getFullYear() - birthDate.getFullYear() + 1;
        notification = {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          message: `День рождения завтра! Исполнится ${age} лет`,
          type: "birthday-tomorrow",
          status: "unread",
        };
      } else if (userMonthDay === nextWeekMonthDay) {
        // День рождения через неделю
        const age = today.getFullYear() - birthDate.getFullYear();
        if (
          nextWeek.getMonth() < birthDate.getMonth() ||
          (nextWeek.getMonth() === birthDate.getMonth() &&
            nextWeek.getDate() < birthDate.getDate())
        ) {
          age++;
        }
        notification = {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          message: `День рождения через неделю! Исполнится ${age} лет`,
          type: "birthday-week",
          status: "unread",
        };
      } else if (userMonthDay === nextMonthMonthDay) {
        // День рождения через месяц
        const age = today.getFullYear() - birthDate.getFullYear();
        if (
          nextMonth.getMonth() < birthDate.getMonth() ||
          (nextMonth.getMonth() === birthDate.getMonth() &&
            nextMonth.getDate() < birthDate.getDate())
        ) {
          age++;
        }
        notification = {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          message: `День рождения через месяц! Исполнится ${age} лет`,
          type: "birthday-month",
          status: "unread",
        };
      }

      // Создаем уведомление, если оно не существует
      if (notification) {
        // Проверяем, не создано ли уже такое уведомление сегодня
        const existingNotification = await Notifications.findOne({
          where: {
            userId: notification.userId,
            type: notification.type,
            createdAt: {
              [Op.gte]: today,
            },
          },
        });

        if (!existingNotification) {
          await Notifications.create(notification);
          console.log(
            `Создано уведомление о дне рождения для ${user.firstName} ${user.lastName}`
          );
        }
      }
    }

    // Проверка дней рождения по еврейскому календарю
    const hebrewToday = new Hebcal.HDate(today);
    const hebrewTomorrow = new Hebcal.HDate(tomorrow);
    const hebrewNextWeek = new Hebcal.HDate(nextWeek);

    for (const user of allUsers) {
      if (user.hebrewDate) {
        let hebrewNotification = null;

        // Извлекаем месяц и день из еврейской даты
        const userHebrewParts = user.hebrewDate.split(" ");
        const todayHebrewParts = hebrewToday.toString().split(" ");
        const tomorrowHebrewParts = hebrewTomorrow.toString().split(" ");
        const nextWeekHebrewParts = hebrewNextWeek.toString().split(" ");

        if (
          userHebrewParts[0] === todayHebrewParts[0] &&
          userHebrewParts[1] === todayHebrewParts[1]
        ) {
          // Еврейский день рождения сегодня
          hebrewNotification = {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            message: `Сегодня еврейский день рождения! (${user.hebrewDate})`,
            type: "hebrew-birthday-today",
            status: "unread",
          };
        } else if (
          userHebrewParts[0] === tomorrowHebrewParts[0] &&
          userHebrewParts[1] === tomorrowHebrewParts[1]
        ) {
          // Еврейский день рождения завтра
          hebrewNotification = {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            message: `Завтра еврейский день рождения! (${user.hebrewDate})`,
            type: "hebrew-birthday-tomorrow",
            status: "unread",
          };
        } else if (
          userHebrewParts[0] === nextWeekHebrewParts[0] &&
          userHebrewParts[1] === nextWeekHebrewParts[1]
        ) {
          // Еврейский день рождения через неделю
          hebrewNotification = {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            message: `Через неделю еврейский день рождения! (${user.hebrewDate})`,
            type: "hebrew-birthday-week",
            status: "unread",
          };
        }

        if (hebrewNotification) {
          const existingHebrewNotification = await Notifications.findOne({
            where: {
              userId: hebrewNotification.userId,
              type: hebrewNotification.type,
              createdAt: {
                [Op.gte]: today,
              },
            },
          });

          if (!existingHebrewNotification) {
            await Notifications.create(hebrewNotification);
            console.log(
              `Создано уведомление о еврейском дне рождения для ${user.firstName} ${user.lastName}`
            );
          }
        }
      }
    }

    console.log("Проверка дней рождения завершена");
  } catch (error) {
    console.error("Ошибка при проверке дней рождения:", error);
  }
}

module.exports = { checkUpcomingBarMitzvahs, checkUpcomingBirthdays };
