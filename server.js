//Серверные экспорты
const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
app.use(express.json());
const PORT = 3000;

//Экспорт API
const exportRoutes = require("./api/export");
const userRoutes = require("./api/user");
const usersRoutes = require("./api/users");
const notificationsRouter = require("./api/notifications");
const datesRouter = require("./api/date");

// Настройка планировщика
const setupScheduler = require("./scheduler");
setupScheduler();

// Включаем CORS с настройками по умолчанию
app.use(cors());

// Настройка CORS
const corsOptions = {
  origin: "http://geula-list.ru",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Используем маршруты
app.use("/api/user", userRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/notifications", notificationsRouter);
app.use("/api/dates", datesRouter);

//Основная дб
const sequelize = require("./db");

//Основная дб
const sequelize_notifications = require("./db_notifications");

// Проверка соединения с БД
sequelize
  .authenticate()
  .then(() => console.log("Соединение с базой данных установлено"))
  .catch((err) => console.error("Невозможно подключиться к базе данных:", err));

// Синхронизация таблиц
sequelize
  .sync()
  .then(() => console.log("Основные таблицы синхронизированы"))
  .catch((err) => console.error("Ошибка синхронизации:", err));

// Проверка соединения с БД уведомлений
sequelize_notifications
  .authenticate()
  .then(() => console.log("Соединение с базой данных уведомлений установлено"))
  .catch((err) => console.error("Невозможно подключиться к базе данных:", err));

// Синхронизация таблиц
sequelize_notifications
  .sync()
  .then(() => console.log("Основные таблицы уведомлений синхронизированы"))
  .catch((err) => console.error("Ошибка синхронизации:", err));

// Используйте переменную HOST
const HOST = process.env.HOST || "0.0.0.0";

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
