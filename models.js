const sequelize = require("./db");
const { Sequelize, DataTypes } = require("sequelize");
const UserMedia = require("./models_media");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: true },
    lastName: { type: DataTypes.STRING, allowNull: true },
    fatherName: { type: DataTypes.STRING, allowNull: true },
    birthDate: { type: DataTypes.DATE, allowNull: true },
    hebrewDate: { type: DataTypes.STRING, allowNull: true },
    age: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
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
    religiousInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        keepsSabbath: false,
        keepsKosher: false,
        hasTT: false,
        seminarParticipant: false,
        hasCommunityBooks: false,
        childrenCamp: false,
        passover: false,
        isInNeed: false,
      },
    },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
  },
  {
    tableName: "users", // Явное указание имени таблицы
  }
);

User.hasMany(UserMedia, { foreignKey: "userId" });
UserMedia.belongsTo(User, { foreignKey: "userId" });

module.exports = User;
