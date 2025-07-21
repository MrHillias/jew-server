const { Model, DataTypes } = require("sequelize");
const sequelize = require("./db");

// Модель для родственных связей между пользователями
class UserRelation extends Model {}

UserRelation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    relatedUserId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Может быть null, если родственник не в базе
      references: {
        model: "users",
        key: "id",
      },
    },
    relationType: {
      type: DataTypes.STRING,
      allowNull: false,
      // Типы: parent, child, spouse, sibling, grandparent, grandchild, etc.
    },
    // Информация о родственнике, если его нет в базе
    relatedPersonInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        firstName: null,
        lastName: null,
        fatherName: null,
        birthDate: null,
        hebrewDate: null,
        gender: null,
        mobileNumber: null,
        email: null,
        notes: null,
        isDeceased: false,
        deceasedDate: null,
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "UserRelation",
    tableName: "user_relations",
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["relatedUserId"],
      },
      {
        fields: ["relationType"],
      },
    ],
  }
);

// Модель для типов родственных связей (справочник)
class RelationType extends Model {}

RelationType.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    nameRu: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nameHe: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reverseType: {
      type: DataTypes.STRING,
      allowNull: true, // Обратный тип связи (parent -> child)
    },
    genderSpecific: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Зависит ли название от пола
    },
  },
  {
    sequelize,
    modelName: "RelationType",
    tableName: "relation_types",
  }
);

module.exports = { UserRelation, RelationType };
