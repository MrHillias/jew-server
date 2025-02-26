const { Model, DataTypes } = require("sequelize");
const sequelize = require("./db_media");

class UserMedia extends Model {}

UserMedia.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserMedia",
  }
);

module.exports = UserMedia;
