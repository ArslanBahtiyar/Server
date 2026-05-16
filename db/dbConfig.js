const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // SSL ayarını buraya ekliyoruz
  ssl: {
    rejectUnauthorized: false, // Neon gibi bulut sağlayıcılar için bu genellikle gereklidir
  },
});

// Havuz (Pool) hatalarını yakala
pool.on('error', (err, client) => {
  console.error('Beklenmedik veritabanı hatası (boştaki istemci):', err);
});

// Test bağlantısı ve hemen bırakma (release)
pool
  .connect()
  .then((client) => {
    console.log("PostgreSQL bağlandı");
    client.release(); // Bağlantıyı havuza geri bırak
  })
  .catch((err) => console.error("Veritabanı bağlantı hatası:", err));

module.exports = pool;
