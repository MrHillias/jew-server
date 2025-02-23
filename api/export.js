const express = require("express");
const { User } = require("../models");
const ExcelJS = require("exceljs");
const XLSX = require("xlsx");

const router = express.Router();

// API для скачивания бд по выбранным пользователям
router.post("/export", async (req, res) => {
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
router.get("/export", async (req, res) => {
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

module.exports = router;
