const bcrypt = require("bcryptjs");
const pool = require("../db/dbConfig");
const jwt = require("jsonwebtoken");


const getMyProfile = async (req, res) => {
  const communityId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT c."Id", c."Name", c."Email", c."ProfilePhoto", c."Description",
              (SELECT COUNT(*) FROM "CommunityFollows" WHERE "CommunityId" = c."Id") as "FollowerCount"
       FROM "Communities" c 
       WHERE c."Id" = $1`,
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

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Geçersiz e-posta formatı." });
    }
  }

  if (password && password.trim().length < 6) {
    return res.status(400).json({ message: "Şifre en az 6 karakter olmalıdır." });
  }

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
      `SELECT * FROM "CommunityFollows" WHERE "UserId" = $1 AND "CommunityId" = $2`,
      [userId, communityId],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Bu topluluğu zaten takip ediyorsunuz." });
    }

    await pool.query(
      `INSERT INTO "CommunityFollows" ("UserId", "CommunityId") VALUES ($1, $2)`,
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
      `DELETE FROM "CommunityFollows" WHERE "UserId" = $1 AND "CommunityId" = $2 RETURNING *`,
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
       FROM "CommunityFollows" cf
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

const getCommunityById = async (req, res) => {
  const { id } = req.params;
  let userId = null;

  // Manuel token kontrolü (opsiyonel giriş için)
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      // Token geçersizse sessizce devam et
    }
  }

  try {
    // 3 bağımsız sorguyu eş zamanlı çalıştır (Promise.all ile %60+ hızlanma)
    const [communityResult, followersResult, eventsResult] = await Promise.all([
      pool.query(
        `SELECT "Id", "Name", "ProfilePhoto", "Description", "Email" 
         FROM "Communities" 
         WHERE "Id" = $1`,
        [id]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM "CommunityFollows" WHERE "CommunityId" = $1`,
        [id]
      ),
      pool.query(
        `SELECT e.*, c."Name" as "CategoryName" 
         FROM "Events" e
         LEFT JOIN "Categories" c ON e."CategoryId" = c."Id"
         WHERE e."CreatedByCommunityId" = $1 
         ORDER BY e."EventDate" DESC`,
        [id]
      )
    ]);

    if (communityResult.rows.length === 0) {
      return res.status(404).json({ message: "Topluluk bulunamıdı." });
    }

    const followerCount = parseInt(followersResult.rows[0].count);

    // Takip kontrolü sadece giriş yapmış kullanıcılar için
    let isFollowing = false;
    if (userId) {
      const followCheck = await pool.query(
        `SELECT 1 FROM "CommunityFollows" WHERE "UserId" = $1 AND "CommunityId" = $2 LIMIT 1`,
        [userId, id]
      );
      isFollowing = followCheck.rows.length > 0;
    }

    res.status(200).json({
      ...communityResult.rows[0],
      followerCount,
      isFollowing,
      events: eventsResult.rows
    });
  } catch (err) {
    console.error("getCommunityById hatası:", err.message);
    res.status(500).json({
      message: "Sunucu hatası.",
      error: err.message
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  followCommunity,
  unfollowCommunity,
  getFollowedCommunities,
  getAllCommunities,
  getCommunityById
};
