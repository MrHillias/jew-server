const express = require("express");
const app = express();
const PORT = 3000;

// Используйте переменную HOST
const HOST = process.env.HOST || "0.0.0.0";

app.get("/", (req, res) => {
  res.send("success");
});

app.get("/test", (req, res) => {
  res.send("success");
});

// Запуск сервера
app.listen(PORT, () => {
  // Определите baseUrl
  const baseUrl = `http://${HOST}:${PORT}`;
  console.log(`Сервер запущен по адресу ${baseUrl}`);
});
