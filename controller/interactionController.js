const pool = require("../db/dbConfig");

const logInteraction = async (req, res) => {
    const { eventId, interactionType } = req.body;
    const userId = req.user.id;

    if (!eventId || !interactionType) {
        return res.status(400).json({ message: "EventId ve InteractionType zorunludur." });
    }

    try {
        // Önce mevcut bir etkileşim var mı kontrol et
        const checkQuery = `SELECT * FROM "UserEventInteractions" WHERE "UserId" = $1 AND "EventId" = $2`;
        const checkResult = await pool.query(checkQuery, [userId, eventId]);

        let result;
        if (checkResult.rows.length > 0) {
            // Kayıt varsa güncelle (view -> like veya like -> view geçişleri için)
            const updateQuery = `
                UPDATE "UserEventInteractions" 
                SET "InteractionType" = $1 
                WHERE "UserId" = $2 AND "EventId" = $3 
                RETURNING *;
            `;
            result = await pool.query(updateQuery, [interactionType, userId, eventId]);
        } else {
            // Kayıt yoksa yeni oluştur
            const insertQuery = `
                INSERT INTO "UserEventInteractions" ("UserId", "EventId", "InteractionType")
                VALUES ($1, $2, $3)
                RETURNING *;
            `;
            result = await pool.query(insertQuery, [userId, eventId, interactionType]);
        }

        res.status(200).json({
            message: "Etkileşim başarıyla işlendi.",
            data: result.rows[0]
        });
    } catch (err) {
        console.error("Etkileşim kaydedilirken hata oluştu:", err);
        res.status(500).json({ message: "Sunucu hatası." });
    }
};

module.exports = {
    logInteraction
};
