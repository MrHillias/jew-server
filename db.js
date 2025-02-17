const { Sequelize } = require("sequelize");

module.exports = new Sequelize("bd-geula", "root", "Fud5e@$$", {
  host: "79.174.88.83",
  port: "18631",
  dialect: "postgres",
});
