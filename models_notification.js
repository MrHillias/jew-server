const sequelize = require("./db");
const { Sequelize, DataTypes } = require("sequelize");

const Notifications = sequelize.define(
  "Notifications",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: "not read" },
  },
  {
    tableName: "notifications", // Явное указание имени таблицы
  }
);

module.exports = Notifications;
