const bcrypt = require("bcryptjs");
const pool = require("../db/dbConfig");

const getMyProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT "Id", "Name", "Email", "ProfilePhoto", "Department" FROM "Users" WHERE "Id" = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, department, profilePhoto, password } = req.body;

  try {
    // Mevcut kullanıcıyı al
    const existing = await pool.query(`SELECT * FROM "Users" WHERE "Id" = $1`, [
      userId,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const current = existing.rows[0];

    // Email değiştirilmek isteniyorsa başkası kullanıyor mu kontrol et
    if (email && email !== current.Email) {
      const emailCheck = await pool.query(
        `SELECT "Id" FROM "Users" WHERE "Email" = $1 AND "Id" != $2`,
        [email, userId],
      );
      if (emailCheck.rows.length > 0) {
        return res
          .status(409)
          .json({ message: "Bu email adresi zaten kullanımda." });
      }
    }

    // Yeni şifre varsa hashle, yoksa mevcut hash'i kullan
    let newPasswordHash = current.PasswordHash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      newPasswordHash = await bcrypt.hash(password, salt);
    }

    const result = await pool.query(
      `UPDATE "Users"
       SET "Name" = $1, "Email" = $2, "Department" = $3, "ProfilePhoto" = $4, "PasswordHash" = $5
       WHERE "Id" = $6
       RETURNING "Id", "Name", "Email", "ProfilePhoto", "Department"`,
      [
        name || current.Name,
        email || current.Email,
        department || current.Department,
        profilePhoto || current.ProfilePhoto,
        newPasswordHash,
        userId,
      ],
    );


    res.status(200).json({
      message: "Profil başarıyla güncellendi.",
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

module.exports = { getMyProfile, updateMyProfile };
