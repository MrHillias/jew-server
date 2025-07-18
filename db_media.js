const { Sequelize } = require("sequelize");

module.exports = new Sequelize("db_geula", "root", "Fud5e@$$", {
  host: "79.174.88.183",
  port: "19894",
  dialect: "postgres",
  logging: console.log, // Включаем логирование SQL-запросов
});
