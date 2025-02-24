const User = require("./models"); // Импорт модели User
const calculateAge = require("./ageCalculator"); // Импорт функции calculateAge

async function recalculateAges() {
  try {
    // Получение всех пользователей из базы данных
    const users = await User.findAll();

    // Обновление возраста каждого пользователя
    for (const user of users) {
      const newAge = calculateAge(user.birthDate); // Предполагается, что у пользователя есть поле birthDate
      await user.update({ age: newAge }); // Обновление поля age в базе данных
    }

    console.log("Возраст всех пользователей успешно обновлён.");
  } catch (error) {
    console.error("Ошибка при обновлении возраста пользователей:", error);
  }
}

module.exports = { recalculateAges };
