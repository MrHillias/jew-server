const express = require("express");
const { User } = require("../models");
const Hebcal = require("hebcal");

const router = express.Router();

const calculateAge = require("../ageCalculator");

// API для занесения нового пользователя
router.post("/reg", async (req, res) => {
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

    // Преобразование даты рождения в еврейскую дату
    const date = new Date(birthDate);
    const hebrewDate = new Hebcal.HDate(date);
    const hebrewDateString = hebrewDate.toString(); // Преобразование в строку

    const age = calculateAge(birthDate);

    const userInfo = await User.create({
      firstName: firstName,
      lastName: lastName,
      fatherName: fatherName,
      birthDate: birthDate || null,
      hebrewDate: hebrewDateString || null,
      age: age,
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

// API для получения инфы по отдельному пользователю
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "fatherName",
        "birthDate",
        "hebrewDate",
        "age",
        "mobileNumber",
        "email",
        "gender",
        "address",
        "religiousInfo",
        "notes",
      ], // Указываем нужные поля
    });
    if (user) {
      return res.json(user);
    }
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    return res.status(500).json({ error: "Ошибка при поиске пользователя" });
  }
});

// API для изменения инфы по отдельному пользователю
router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
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
      notes,
    } = req.body;

    // Найдите пользователя по id
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Подготовка данных для обновления
    const updateData = {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      fatherName: fatherName || user.fatherName,
      mobileNumber: mobileNumber || user.mobileNumber,
      email: email || user.email,
      gender: gender || user.gender,
      address: address || user.address,
      religiousInfo: religiousInfo || user.religiousInfo,
      notes: notes !== undefined ? notes : user.notes,
    };

    // Если изменилась дата рождения, пересчитываем возраст и еврейскую дату
    if (birthDate && birthDate !== user.birthDate) {
      updateData.birthDate = birthDate;

      // Пересчет возраста
      updateData.age = calculateAge(birthDate);

      // Преобразование даты рождения в еврейскую дату
      const date = new Date(birthDate);
      const hebrewDate = new Hebcal.HDate(date);
      updateData.hebrewDate = hebrewDate.toString();
    }

    // Обновите данные пользователя
    await user.update(updateData);

    // Отправьте обновленные данные пользователя в ответе
    res.json(user);
  } catch (error) {
    console.error("Ошибка при обновлении пользователя:", error);
    res.status(500).json({ error: "Ошибка при обновлении пользователя" });
  }
});

// API для удаления пользователя
router.delete("/:id", async (req, res) => {
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

module.exports = router;
