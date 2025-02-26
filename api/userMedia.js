const express = require("express");
const path = require("path");
const upload = require("../upload"); // Импортируем конфигурацию multer
const UserMedia = require("../models_media"); // Импорт модели UserMedia

const router = express.Router();

// POST-метод для загрузки изображения
router.post("/upload/:userId", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("Ошибка загрузки файла:", err);
      return res.status(400).json({ error: "Ошибка загрузки файла" });
    }

    const { userId } = req.params;
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }

      console.log("Файл загружен:", req.file.path);

      const media = await UserMedia.create({
        userId: userId,
        filePath: req.file.path,
        fileName: req.file.filename,
      });

      res.status(201).json({ message: "Файл успешно загружен", media });
    } catch (error) {
      console.error("Ошибка при сохранении в базу данных:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
});

// GET-метод для получения изображения по имени файла
router.get("/images/:fileName", async (req, res) => {
  const { fileName } = req.params;
  try {
    const media = await UserMedia.findOne({ where: { fileName } });
    if (!media) {
      return res.status(404).json({ error: "Файл не найден" });
    }
    // Используем path.resolve для формирования абсолютного пути
    const filePath = path.resolve(rootDir, media.filePath);

    res.sendFile(filePath);
  } catch (error) {
    console.error("Ошибка при получении файла:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
