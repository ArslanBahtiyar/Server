const pool = require("../db/dbConfig");

// GET /categories/events
const getEventCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "Id", "Name" FROM "Categories" ORDER BY "Name" ASC`
    );

    res.status(200).json(result.rows);
  } catch (err) {

    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

module.exports = { getEventCategories };
