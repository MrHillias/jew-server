// Файл для установки всех связей между моделями
const { User, UserMedia } = require("./models");
const { UserRelation, RelationType } = require("./models_relations");

// Устанавливаем связи между User и UserRelation
User.hasMany(UserRelation, {
  foreignKey: "userId",
  as: "relations",
});

User.hasMany(UserRelation, {
  foreignKey: "relatedUserId",
  as: "relatedTo",
});

UserRelation.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

UserRelation.belongsTo(User, {
  foreignKey: "relatedUserId",
  as: "relatedUser",
});

// Экспортируем все модели из одного места
module.exports = {
  User,
  UserMedia,
  UserRelation,
  RelationType,
};
