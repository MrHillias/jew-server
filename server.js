const express = require("express");
const app = express();
const cors = require("cors");
const { Client } = require("pg");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const fs = require("fs");
app.use(express.json());
const PORT = 3000;

// Включаем CORS с настройками по умолчанию
app.use(cors());

// Настройка CORS
const corsOptions = {
  origin: "http://geula-list.ru", // Замените на домен вашего фронтенда
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

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

// API для скачивания бд по выбранным пользователям
app.post("/export", async (req, res) => {
  try {
    const ids = req.body.ids; // Получаем массив id из тела запроса

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Необходимо предоставить массив id" });
    }

    // Получаем пользователей по переданным id
    const users = await User.findAll({
      where: {
        id: ids,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователи не найдены" });
    }

    // Создаем новый Excel-файл
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    // Добавляем заголовки
    worksheet.columns = [
      { header: "Фамилия", key: "lastName", width: 30 },
      { header: "Имя", key: "firstName", width: 30 },
      { header: "Отчество", key: "fatherName", width: 30 },
      { header: "Возраст", key: "age", width: 10 },
      { header: "Мобильный номер", key: "mobileNumber", width: 15 },
      { header: "Email", key: "email", width: 30 },
      { header: "Пол", key: "gender", width: 10 },
      { header: "Город", key: "city", width: 30 },
      { header: "Улица", key: "street", width: 30 },
      { header: "Номер дома", key: "houseNumber", width: 15 },
      { header: "Корпус", key: "building", width: 15 },
      { header: "Квартира", key: "apartment", width: 15 },
      { header: "Станция метро", key: "metroStation", width: 15 },
    ];

    // Сортируем пользователей по lastName
    users.sort((a, b) => {
      const lastNameA = a.lastName.toLowerCase(); // Приводим к нижнему регистру для корректной сортировки
      const lastNameB = b.lastName.toLowerCase();
      if (lastNameA < lastNameB) return -1;
      if (lastNameA > lastNameB) return 1;
      return 0;
    });

    // Добавляем данные пользователей в Excel
    users.forEach((user) => {
      const addresses = user.address; // Предполагаем, что address - это массив объектов
      if (Array.isArray(addresses) && addresses.length > 0) {
        addresses.forEach((address) => {
          worksheet.addRow({
            lastName: user.lastName,
            firstName: user.firstName,
            fatherName: user.fatherName,
            age: user.age,
            mobileNumber: user.mobileNumber,
            email: user.email,
            gender: user.gender,
            city: address.city || "",
            street: address.street || "",
            houseNumber: address.houseNumber || "",
            building: address.building || "",
            apartment: address.apartment || "",
            metroStation: address.metroStation || "",
          });
        });
      } else {
        // Если адресов нет, добавляем строку с пустыми значениями
        worksheet.addRow({
          lastName: user.lastName,
          firstName: user.firstName,
          fatherName: user.fatherName,
          age: user.age,
          mobileNumber: user.mobileNumber,
          email: user.email,
          gender: user.gender,
          city: "",
          street: "",
          houseNumber: "",
          building: "",
          apartment: "",
          metroStation: "",
        });
      }
    });

    // Устанавливаем заголовки для скачивания файла
    res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Записываем файл в ответ
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Ошибка при выгрузке данных:", error);
    res.status(500).json({ error: "Ошибка при выгрузке данных" });
  }
});

// API для скачивания бд
app.get("/export", async (req, res) => {
  try {
    // Использование Sequelize для получения только нужных данных
    const users = await User.findAll({
      attributes: [
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "mobileNumber",
        "email",
        "gender",
        "address",
      ],
    });

    // Преобразование данных в формат JSON
    const data = users.map((user) => user.toJSON());

    // Создание заголовков
    const headers = [
      "Имя",
      "Фамилия",
      "Отчество",
      "Возраст",
      "Мобильный номер",
      "email",
      "Пол",
      "Адрес",
    ];

    // Преобразование данных в формат, подходящий для xlsx
    const worksheetData = [
      headers,
      ...data.map((user) => [
        user.firstName,
        user.lastName,
        user.fatherName,
        user.birthDate,
        user.mobileNumber,
        user.email,
        user.gender,
        JSON.stringify(user.address), // Преобразуем объект address в строку
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
        return res.status(500).send("Ошибка при отправке файла");
      }

      // Удаление файла после отправки
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Ошибка при удалении файла:", unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error("Ошибка при выгрузке данных:", error);
    res.status(500).send("Ошибка при выгрузке данных");
  }
});

// API для занесения нового пользователя
app.post("/user/reg", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      fatherName,
      birthDate,
      mobileNumber,
      email,
      gender,
      address,
      religiousInfo,
    } = req.body;
    console.log(firstName, lastName, fatherName, birthDate);
    const userInfo = await User.create({
      firstName: firstName,
      lastName: lastName,
      fatherName: fatherName,
      birthDate: birthDate || null,
      mobileNumber: mobileNumber,
      email: email,
      gender: gender,
      address: address,
      religiousInfo: religiousInfo,
    });
    await userInfo.save();
    console.log("Юзер добавлен:", userInfo);
    return res.json(userInfo);
  } catch (error) {
    console.error("Ошибка при создании юзера:", error); // Логирование ошибки
    res.status(500).json({ error: "Ошибка при создании юзера" });
  }
});

// API для получения всех строк по выбранным колонкам
app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "mobileNumber",
        "email",
        "gender",
        "address",
        "religiousInfo",
      ], // Указываем нужные поля
    });

    // Отправка данных клиенту
    res.json(users);
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
      attributes: [
        "id",
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "mobileNumber",
        "email",
        "gender",
        "address",
        "religiousInfo",
      ], // Указываем нужные поля
    });
    if (user) {
      return res.json(user);
    }
  } catch (error) {
    return res.status(500).json({ error: "Ошибка при поиске пользователя" });
  }
});

// API для изменения инфы по отдельному пользователю
app.put("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id; // Получаем id из параметров URL
    const {
      firstName,
      lastName,
      fatherName,
      birthDate,
      mobileNumber,
      email,
      gender,
      address,
      religiousInfo,
    } = req.body; // Получаем данные для обновления из тела запроса

    // Найдите пользователя по id
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Обновите данные пользователя
    await user.update({
      firstName: firstName,
      lastName: lastName,
      fatherName: fatherName,
      birthDate: birthDate,
      mobileNumber: mobileNumber,
      email: email,
      gender: gender,
      address: address,
      religiousInfo: religiousInfo,
    });

    // Отправьте обновленные данные пользователя в ответе
    res.json(user);
  } catch (error) {
    console.error("Ошибка при обновлении пользователя:", error);
    res.status(500).json({ error: "Ошибка при обновлении пользователя" });
  }
});

// API для удаления пользователя
app.delete("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id; // Получаем id из параметров URL

    // Найдите пользователя по id
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Удалите пользователя
    await user.destroy();

    // Отправьте подтверждение удаления
    res.json({ message: "Пользователь успешно удален" });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({ error: "Ошибка при удалении пользователя" });
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
