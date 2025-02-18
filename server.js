const express = require("express");
const app = express();
const { Client } = require("pg");
const XLSX = require("xlsx");
const fs = require("fs");
app.use(express.json());
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

// API для скачивания бд
app.get("/export", async (req, res) => {
  try {
    // Использование Sequelize для получения только нужных данных
    const users = await User.findAll({
      attributes: ["firstname", "lastname", "fathername", "age"], // Укажите нужные поля
    });

    // Преобразование данных в формат JSON
    const data = users.map((user) => user.toJSON());
    // Создание заголовков
    const headers = ["Имя", "Фамилия", "Отчество", "Возраст"];

    // Преобразование данных в формат, подходящий для xlsx
    const worksheetData = [
      headers,
      ...data.map((user) => [
        user.firstname,
        user.lastname,
        user.fathername,
        user.age,
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    // Запись файла на диск
    const filePath = "./data.xlsx";
    XLSX.writeFile(workbook, filePath);

    // Отправка файла клиенту
    res.download(filePath, "data.xlsx", (err) => {
      if (err) {
        console.error("Ошибка при отправке файла:", err);
        res.status(500).send("Ошибка при отправке файла");
      }

      // Удаление файла после отправки
      fs.unlinkSync(filePath);
    });
    return res.send("Отправка совершена");
  } catch (error) {
    console.error("Ошибка при выгрузке данных:", error);
    res.status(500).send("Ошибка при выгрузке данных");
  }
});

// API для занесения нового пользователя
app.post("/user/reg", async (req, res) => {
  try {
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
    return res.send("Пользователь создан");
  } catch (error) {
    console.error("Ошибка при создании юзера:", error); // Логирование ошибки
    res.status(500).json({ error: "Ошибка при создании юзера" });
  }
});

// API для получения всех строк по выбранным колонкам
app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["firstname", "lastname", "fathername", "age"], // Указываем нужные поля
    });

    // Отправка данных клиенту
    res.json(users);

    return res.send("Данные загружены");
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    res.status(500).json({ error: "Ошибка при получении данных" });
  }
});

// API для получения инфы по отдельному пользователю
app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
      attributes: ["firstname", "lastname", "fathername", "age"], // Указываем нужные поля
    });
    if (user) {
      return res.json(user);
    }
  } catch (error) {
    return res.status(500).json({ error: "Ошибка при поиске пользователя" });
  }
});

//Фановые API, чтобы убедиться, что все раб отает
app.get("/", (req, res) => {
  res.send("success");
});

app.get("/test", (req, res) => {
  res.send("test success");
});

// Запуск сервера
app.listen(PORT, () => {
  const baseUrl = `http://${HOST}:${PORT}`;
  console.log(`Сервер запущен по адресу ${baseUrl}`);
});
