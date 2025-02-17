const sequelize = require("./db");
const { DataTypes } = require("sequelize");

const User = sequelize.define("user", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstname: { type: DataTypes.STRING, nullable: true },
  lastname: { type: DataTypes.STRING, nullable: true },
  fathername: { type: DataTypes.STRING, nullable: true },
  age: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
});

module.exports = User;
