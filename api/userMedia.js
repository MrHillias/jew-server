const express = require("express");
const upload = require("../upload"); // Импортируем конфигурацию multer
const { UserMedia } = require("../models_media"); // Импорт модели UserMedia

const router = express.Router();

// POST-метод для загрузки изображения
router.post("/upload/:userId", upload.single("image"), async (req, res) => {
  const { userId } = req.params;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    // Сохранение информации о файле в базе данных
    const media = await UserMedia.create({
      userId: userId,
      filePath: req.file.path,
      fileName: req.file.filename,
    });

    res.status(201).json({ message: "Файл успешно загружен", media });
  } catch (error) {
    console.error("Ошибка при загрузке файла:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET-метод для получения изображения по имени файла
router.get("/images/:fileName", async (req, res) => {
  const { fileName } = req.params;
  try {
    const media = await UserMedia.findOne({ where: { fileName } });
    if (!media) {
      return res.status(404).json({ error: "Файл не найден" });
    }

    res.sendFile(path.resolve(media.filePath), { root: "." });
  } catch (error) {
    console.error("Ошибка при получении файла:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
