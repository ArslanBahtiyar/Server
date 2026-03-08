const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


// test bağlantısı
pool.connect()
  .then(() => console.log("PostgreSQL bağlandı"))
  .catch(err => console.error("Bağlantı hatası", err));

module.exports = pool;