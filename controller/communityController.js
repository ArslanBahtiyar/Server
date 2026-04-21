const bcrypt = require("bcryptjs");
const pool = require("../db/dbConfig");

const getMyProfile = async (req, res) => {
  const communityId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT "Id", "Name", "Email", "ProfilePhoto", "Description" FROM "Communities" WHERE "Id" = $1`,
      [communityId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Topluluk bulunamadı." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const updateMyProfile = async (req, res) => {
  const communityId = req.user.id;
  const { name, email, description, profilePhoto, password } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM "Communities" WHERE "Id" = $1`,
      [communityId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Topluluk bulunamadı." });
    }

    const current = existing.rows[0];

    if (email && email !== current.Email) {
      const emailCheck = await pool.query(
        `SELECT "Id" FROM "Communities" WHERE "Email" = $1 AND "Id" != $2`,
        [email, communityId],
      );
      if (emailCheck.rows.length > 0) {
        return res
          .status(409)
          .json({ message: "Bu email adresi zaten kullanımda." });
      }
    }

    let newPasswordHash = current.PasswordHash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      newPasswordHash = await bcrypt.hash(password, salt);
    }

    const result = await pool.query(
      `UPDATE "Communities"
       SET "Name" = $1, "Email" = $2, "Description" = $3, "ProfilePhoto" = $4, "PasswordHash" = $5
       WHERE "Id" = $6
       RETURNING "Id", "Name", "Email", "ProfilePhoto", "Description"`,
      [
        name || current.Name,
        email || current.Email,
        description || current.Description,
        profilePhoto || current.ProfilePhoto,
        newPasswordHash,
        communityId,
      ],
    );

    res.status(200).json({
      message: "Topluluk profili başarıyla güncellendi.",
      community: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

//Topluluk takip etme
const followCommunity = async (req, res) => {
  const userId = req.user.id;
  const { communityId } = req.params;

  try {
    // Topluluk var mı kontrol et
    const communityCheck = await pool.query(
      `SELECT "Id" FROM "Communities" WHERE "Id" = $1`,
      [communityId],
    );
    if (communityCheck.rows.length === 0) {
      return res.status(404).json({ message: "Topluluk bulunamadı." });
    }

    // Zaten takip ediyor mu kontrol et
    const existing = await pool.query(
      `SELECT * FROM "CommunityFollow" WHERE "UserId" = $1 AND "CommunityId" = $2`,
      [userId, communityId],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Bu topluluğu zaten takip ediyorsunuz." });
    }

    await pool.query(
      `INSERT INTO "CommunityFollow" ("UserId", "CommunityId") VALUES ($1, $2)`,
      [userId, communityId],
    );

    res.status(201).json({ message: "Topluluk başarıyla takip edildi." });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

//Topluluk takibi bırakma
const unfollowCommunity = async (req, res) => {
  const userId = req.user.id;
  const { communityId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM "CommunityFollow" WHERE "UserId" = $1 AND "CommunityId" = $2 RETURNING *`,
      [userId, communityId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Bu topluluğu zaten takip etmiyorsunuz." });
    }

    res.status(200).json({ message: "Topluluk takibi bırakıldı." });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

//Takip edilen toplulukları listeleme
const getFollowedCommunities = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT c."Id", c."Name", c."ProfilePhoto", c."Description"
       FROM "CommunityFollow" cf
       JOIN "Communities" c ON cf."CommunityId" = c."Id"
       WHERE cf."UserId" = $1`,
      [userId],
    );

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const getAllCommunities = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "Id", "Name", "ProfilePhoto", "Description" FROM "Communities" ORDER BY "Name" ASC`,
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

module.exports = { 
  getMyProfile, 
  updateMyProfile, 
  followCommunity, 
  unfollowCommunity, 
  getFollowedCommunities,
  getAllCommunities
};
