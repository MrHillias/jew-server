const express = require("express");
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("success");
});

app.get("/test", (req, res) => {
  res.send("success");
});

// Запуск сервера
app.listen(PORT, () => {
  const HOST = process.env.HOST || "localhost";
  console.log(`Сервер запущен по адресу ${baseUrl}`);
});
