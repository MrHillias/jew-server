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
const mediaRouter = require("./api/userMedia");
const relationsRouter = require("./api/relations");

// Настройка планировщика
const setupScheduler = require("./scheduler");
setupScheduler();

// Включаем CORS с настройками по умолчанию
app.use(cors());

// Настройка CORS
const corsOptions = {
  origin: "http://geula-table.ru",
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
app.use("/api/media", mediaRouter);
app.use("/api/relations", relationsRouter);

//Основная дб
const sequelize = require("./db");

//дб уведоблений
const sequelize_notifications = require("./db_notifications");

//дб картинок
const sequelize_media = require("./db_media");

//дб родственников
const { UserRelation, RelationType } = require("./models_relations");

// Функция для инициализации всех баз данных
async function initializeDatabases() {
  try {
    // 1. Проверка соединения с основной БД
    console.log("Проверка соединения с основной базой данных...");
    await sequelize.authenticate();
    console.log("✓ Соединение с основной базой данных установлено");

    // 2. Проверка соединения с БД уведомлений
    console.log("Проверка соединения с базой данных уведомлений...");
    await sequelize_notifications.authenticate();
    console.log("✓ Соединение с базой данных уведомлений установлено");

    // 3. Проверка соединения с БД медиа
    console.log("Проверка соединения с базой данных медиа...");
    await sequelize_media.authenticate();
    console.log("✓ Соединение с базой данных медиа установлено");

    // 4. Синхронизация всех таблиц
    console.log("\nНачало синхронизации таблиц...");

    // Синхронизация основных таблиц
    await User.sync({ alter: true });
    console.log("✓ Таблица users синхронизирована");

    // Синхронизация таблиц родственных связей
    await RelationType.sync({ alter: true });
    console.log("✓ Таблица relation_types синхронизирована");

    await UserRelation.sync({ alter: true });
    console.log("✓ Таблица user_relations синхронизирована");

    // Синхронизация таблицы уведомлений
    await Notifications.sync({ alter: true });
    console.log("✓ Таблица notifications синхронизирована");

    // Синхронизация таблицы медиа
    await UserMedia.sync({ alter: true });
    console.log("✓ Таблица UserMedia синхронизирована");

    // 5. Инициализация справочных данных
    console.log("\nИнициализация справочных данных...");
    await initializeRelationTypes();

    console.log("\nВсе базы данных успешно инициализированы!");
  } catch (error) {
    console.error("Ошибка при инициализации баз данных:", error);
    process.exit(1); // Завершаем процесс при критической ошибке
  }
}

// Функция инициализации типов родственных связей
async function initializeRelationTypes() {
  const types = [
    {
      type: "father",
      nameRu: "Отец",
      nameHe: "אבא",
      reverseType: "child",
      genderSpecific: true,
    },
    {
      type: "mother",
      nameRu: "Мать",
      nameHe: "אמא",
      reverseType: "child",
      genderSpecific: true,
    },
    {
      type: "son",
      nameRu: "Сын",
      nameHe: "בן",
      reverseType: "parent",
      genderSpecific: true,
    },
    {
      type: "daughter",
      nameRu: "Дочь",
      nameHe: "בת",
      reverseType: "parent",
      genderSpecific: true,
    },
    {
      type: "husband",
      nameRu: "Муж",
      nameHe: "בעל",
      reverseType: "wife",
      genderSpecific: true,
    },
    {
      type: "wife",
      nameRu: "Жена",
      nameHe: "אישה",
      reverseType: "husband",
      genderSpecific: true,
    },
    {
      type: "brother",
      nameRu: "Брат",
      nameHe: "אח",
      reverseType: "sibling",
      genderSpecific: true,
    },
    {
      type: "sister",
      nameRu: "Сестра",
      nameHe: "אחות",
      reverseType: "sibling",
      genderSpecific: true,
    },
    {
      type: "grandfather",
      nameRu: "Дедушка",
      nameHe: "סבא",
      reverseType: "grandchild",
      genderSpecific: true,
    },
    {
      type: "grandmother",
      nameRu: "Бабушка",
      nameHe: "סבתא",
      reverseType: "grandchild",
      genderSpecific: true,
    },
    {
      type: "grandson",
      nameRu: "Внук",
      nameHe: "נכד",
      reverseType: "grandparent",
      genderSpecific: true,
    },
    {
      type: "granddaughter",
      nameRu: "Внучка",
      nameHe: "נכדה",
      reverseType: "grandparent",
      genderSpecific: true,
    },
    {
      type: "uncle",
      nameRu: "Дядя",
      nameHe: "דוד",
      reverseType: "nephew",
      genderSpecific: true,
    },
    {
      type: "aunt",
      nameRu: "Тётя",
      nameHe: "דודה",
      reverseType: "niece",
      genderSpecific: true,
    },
    {
      type: "nephew",
      nameRu: "Племянник",
      nameHe: "אחיין",
      reverseType: "uncle",
      genderSpecific: true,
    },
    {
      type: "niece",
      nameRu: "Племянница",
      nameHe: "אחיינית",
      reverseType: "aunt",
      genderSpecific: true,
    },
    {
      type: "cousin_male",
      nameRu: "Двоюродный брат",
      nameHe: "בן דוד",
      reverseType: "cousin",
      genderSpecific: true,
    },
    {
      type: "cousin_female",
      nameRu: "Двоюродная сестра",
      nameHe: "בת דודה",
      reverseType: "cousin",
      genderSpecific: true,
    },
  ];

  let created = 0;
  for (const type of types) {
    const [relationTyТре, wasCreated] = await RelationType.findOrCreate({
      where: { type: type.type },
      defaults: type,
    });
    if (wasCreated) created++;
  }

  console.log(
    `Типы родственных связей инициализированы (создано новых: ${created})`
  );
}

// Используем переменную HOST
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
