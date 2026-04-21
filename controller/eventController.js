const pool = require("../db/dbConfig");

const createEvent = async (req, res) => {
  const { title, description, eventDate, location, categoryId, photo } = req.body;
  const { id: creatorId, role } = req.user;

  if (!title || !eventDate || !location) {
    return res
      .status(400)
      .json({ message: "Başlık, tarih ve konum zorunludur." });
  }

  // role'e göre hangi kolona yazılacağını belirle
  const createdByUserId = role === "user" ? creatorId : null;
  const createdByCommunityId = role === "community" ? creatorId : null;

  try {
    const result = await pool.query(
      `INSERT INTO "Events" ("Title", "Description", "EventDate", "Location", "CategoryId", "CreatedByUserId", "CreatedByCommunityId", "Photo")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description || null,
        eventDate,
        location,
        categoryId ? Number(categoryId) : null,
        createdByUserId,
        createdByCommunityId,
        photo || null,
      ],
    );

    res.status(201).json({
      message: "Etkinlik başarıyla oluşturuldu.",
      event: result.rows[0],
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};


const updateEvent = async (req, res) => {
  const { id: eventId } = req.params;
  const { id: creatorId, role } = req.user;
  const { title, description, eventDate, location, categoryId, photo } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM "Events" WHERE "Id" = $1`,
      [eventId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Etkinlik bulunamadı." });
    }

    const event = existing.rows[0];

    // Sadece etkinliği oluşturan güncelleyebilir
    const isOwner =
      (role === "user" && event.CreatedByUserId === creatorId) ||
      (role === "community" && event.CreatedByCommunityId === creatorId);

    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Bu etkinliği güncelleme yetkiniz yok." });
    }

    const result = await pool.query(
      `UPDATE "Events"
       SET "Title" = $1, "Description" = $2, "EventDate" = $3, "Location" = $4, "CategoryId" = $5, "Photo" = $6
       WHERE "Id" = $7
       RETURNING *`,
      [
        title || event.Title,
        description ?? event.Description,
        eventDate || event.EventDate,
        location || event.Location,
        categoryId ?? event.CategoryId,
        photo || event.Photo,
        eventId,
      ],
    );

    res.status(200).json({
      message: "Etkinlik başarıyla güncellendi.",
      event: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const deleteEvent = async (req, res) => {
  const { id: eventId } = req.params;
  const { id: creatorId, role } = req.user;

  try {
    const existing = await pool.query(
      `SELECT * FROM "Events" WHERE "Id" = $1`,
      [eventId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Etkinlik bulunamadı." });
    }

    const event = existing.rows[0];

    // Sadece etkinliği oluşturan silebilir
    const isOwner =
      (role === "user" && event.CreatedByUserId === creatorId) ||
      (role === "community" && event.CreatedByCommunityId === creatorId);

    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Bu etkinliği silme yetkiniz yok." });
    }

    await pool.query(`DELETE FROM "Events" WHERE "Id" = $1`, [eventId]);

    res.status(200).json({ message: "Etkinlik başarıyla silindi." });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c."Name" as "CategoryName" 
       FROM "Events" e
       LEFT JOIN "Categories" c ON e."CategoryId" = c."Id"
       ORDER BY e."Id" DESC`,
    );

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const getMyEvents = async (req, res) => {
  const { id: creatorId, role } = req.user;

  try {
    let query = `
      SELECT e.*, c."Name" as "CategoryName" 
      FROM "Events" e
      LEFT JOIN "Categories" c ON e."CategoryId" = c."Id"
      WHERE `;
    
    let params = [creatorId];

    if (role === "user") {
      query += `e."CreatedByUserId" = $1`;
    } else {
      query += `e."CreatedByCommunityId" = $1`;
    }

    query += ` ORDER BY e."Id" DESC`;

    const result = await pool.query(query, params);

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

module.exports = { createEvent, updateEvent, deleteEvent, getAllEvents, getMyEvents };
