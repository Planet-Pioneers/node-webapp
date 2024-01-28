const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
} = process.env;

module.exports = {
  url: `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin`,
};
