const pool = require("../db/dbConfig");

// POST /comment/add
const addComment = async (req, res) => {
  const { eventId, content } = req.body;
  const { id: userId, role } = req.user;

  if (role !== "user") {
    return res.status(403).json({ message: "Yalnızca bireysel kullanıcılar yorum yapabilir." });
  }

  if (!eventId || !content || content.trim() === "") {
    return res.status(400).json({ message: "Etkinlik ve yorum içeriği zorunludur." });
  }

  try {
    // 1. Yorumu ekle
    const result = await pool.query(
      `INSERT INTO "Comments" ("EventId", "UserId", "Content")
       VALUES ($1, $2, $3)
       RETURNING *`,
      [Number(eventId), userId, content.trim()]
    );

    // 2. Eklenen yorumu kullanıcının bilgileriyle birlikte çek ki arayüzde hemen gösterebilelim
    const commentWithUser = await pool.query(
      `SELECT c.*, u."Name", u."ProfilePhoto"
       FROM "Comments" c
       JOIN "Users" u ON c."UserId" = u."Id"
       WHERE c."Id" = $1`,
      [result.rows[0].Id]
    );

    res.status(201).json({
      message: "Yorum başarıyla eklendi.",
      comment: commentWithUser.rows[0],
    });
  } catch (err) {
    console.error("Yorum ekleme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

// GET /comment/event/:eventId
const getEventComments = async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*, u."Name", u."ProfilePhoto"
       FROM "Comments" c
       JOIN "Users" u ON c."UserId" = u."Id"
       WHERE c."EventId" = $1
       ORDER BY c."CreatedAt" ASC`,
      [Number(eventId)]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Yorumları çekme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

// DELETE /comment/delete/:id
const deleteComment = async (req, res) => {
  const { id: commentId } = req.params;
  const { id: userId } = req.user;

  try {
    const existing = await pool.query(
      `SELECT * FROM "Comments" WHERE "Id" = $1`,
      [Number(commentId)]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }

    const comment = existing.rows[0];

    // Sadece yorumu yapan kullanıcı silebilir
    if (comment.UserId !== userId) {
      return res.status(403).json({ message: "Bu yorumu silme yetkiniz yok." });
    }

    await pool.query(
      `DELETE FROM "Comments" WHERE "Id" = $1`,
      [Number(commentId)]
    );

    res.status(200).json({ message: "Yorum başarıyla silindi." });
  } catch (err) {
    console.error("Yorum silme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

module.exports = {
  addComment,
  getEventComments,
  deleteComment,
};
