const express = require("express");
const app = express();
const PORT = 3000;

//Основная дб
const sequelize = require("./db");
const User = require("./models");

// Проверка соединения с БД
sequelize
  .authenticate()
  .then(() => console.log("Соединение с базой данных установлено"))
  .catch((err) => console.error("Невозможно подключиться к базе данных:", err));

// Синхронизация таблиц
sequelize
  .sync() // Используйте эту строку, чтобы убедиться, что таблицы созданы
  .then(() => console.log("Основные таблицы синхронизированы"))
  .catch((err) => console.error("Ошибка синхронизации:", err));

// Используйте переменную HOST
const HOST = process.env.HOST || "0.0.0.0";

app.post("/user/reg", async (req, res) => {
  try {
    console.log(`Начат поиск`);
    const { firstname, lastname, fathername, age } = req.body;
    console.log(firstname, lastname, fathername, age);
    const userInfo = await User.create({
      firstname: firstname,
      lastname: lastname,
      fathername: fathername,
      age: age,
    });
    await userInfo.save();
    console.log("Юзер добавлен:", userInfo);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании юзера" });
  }
});

app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
    });
    if (user) {
      return res.json(user.firstname, user.lastname, user.fathername, user.age);
    }
  } catch (error) {
    return res.status(500).json({ error: "Ошибка при поиске пользователя" });
  }
});

app.get("/", (req, res) => {
  res.send("success");
});

app.get("/test", (req, res) => {
  res.send("test success");
});

// Запуск сервера
app.listen(PORT, () => {
  // Определите baseUrl
  const baseUrl = `http://${HOST}:${PORT}`;
  console.log(`Сервер запущен по адресу ${baseUrl}`);
});
