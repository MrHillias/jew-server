const sequelize = require("./db");
const { DataTypes } = require("sequelize");

const User = sequelize.define("user", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: { type: DataTypes.STRING, allowNull: true },
  lastName: { type: DataTypes.STRING, allowNull: true },
  fatherName: { type: DataTypes.STRING, allowNull: true },
  birthDate: { type: DataTypes.DATE, allowNull: true },
  mobileNumber: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  email: { type: DataTypes.STRING, allowNull: true },
  gender: { type: DataTypes.STRING, allowNull: true },
  address: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      city: null,
      street: null,
      houseNumber: null,
      building: null,
      apartment: null,
      metroStation: null,
    },
  },
});

module.exports = User;
