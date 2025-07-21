// В конец файла models.js добавьте:

const { UserRelation, RelationType } = require("./models_relations");

// Определение связей
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

// Хуки для автоматического обновления возраста и еврейской даты
User.beforeSave(async (user, options) => {
  // Если дата рождения изменилась или это новый пользователь
  if (user.changed("birthDate") && user.birthDate) {
    // Пересчитываем возраст
    user.age = calculateAge(user.birthDate);

    // Пересчитываем еврейскую дату
    const date = new Date(user.birthDate);
    const hebrewDate = new Hebcal.HDate(date);
    user.hebrewDate = hebrewDate.toString();
  }
});

// Хук для пересчета возраста при массовом обновлении
User.beforeBulkUpdate(async (options) => {
  if (options.attributes.birthDate) {
    // Пересчитываем возраст
    options.attributes.age = calculateAge(options.attributes.birthDate);

    // Пересчитываем еврейскую дату
    const date = new Date(options.attributes.birthDate);
    const hebrewDate = new Hebcal.HDate(date);
    options.attributes.hebrewDate = hebrewDate.toString();
  }
});

module.exports = { User, UserMedia, UserRelation, RelationType };
