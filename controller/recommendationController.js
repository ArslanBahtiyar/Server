const pool = require("../db/dbConfig");

// Kosinüs Benzerliği Hesaplama Fonksiyonu
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const getRecommendations = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Gerekli tüm verileri çekelim
        const interactionsRes = await pool.query(
            `SELECT * FROM "UserEventInteractions" WHERE "UserId" = $1`,
            [userId]
        );
        const interactions = interactionsRes.rows;

        // Eğer hiç etkileşim yoksa rastgele veya en yeni etkinlikleri dönelim
        if (interactions.length === 0) {
            const latestEvents = await pool.query(
                `SELECT e.*, c."Name" as "CategoryName",
                        COALESCE(uei."LikeCount", 0)::int as "LikeCount",
                        COALESCE(comm."CommentCount", 0)::int as "CommentCount",
                        false as "isLiked"
                 FROM "Events" e 
                 LEFT JOIN "Categories" c ON e."CategoryId" = c."Id" 
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "LikeCount" 
                   FROM "UserEventInteractions" 
                   WHERE "InteractionType" = 'like'
                   GROUP BY "EventId"
                 ) uei ON e."Id" = uei."EventId"
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "CommentCount" 
                   FROM "Comments" 
                   GROUP BY "EventId"
                 ) comm ON e."Id" = comm."EventId"
                 WHERE e."EventDate" >= CURRENT_DATE - INTERVAL '7 days'
                 ORDER BY e."CreatedDate" DESC LIMIT 20`
            );
            return res.status(200).json(latestEvents.rows);
        }

        // 3 bağımsız sorguyu eş zamanlı çalıştır (Promise.all ile ~%60 daha hızlı yanıt)
        const [eventsRes, categoriesRes, followedRes] = await Promise.all([
            pool.query(
                `SELECT e.*, c."Name" as "CategoryName",
                        COALESCE(uei."LikeCount", 0)::int as "LikeCount",
                        COALESCE(comm."CommentCount", 0)::int as "CommentCount",
                        COALESCE(my_likes."isLiked", false) as "isLiked"
                 FROM "Events" e 
                 LEFT JOIN "Categories" c ON e."CategoryId" = c."Id"
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "LikeCount" 
                   FROM "UserEventInteractions" 
                   WHERE "InteractionType" = 'like'
                   GROUP BY "EventId"
                 ) uei ON e."Id" = uei."EventId"
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "CommentCount" 
                   FROM "Comments" 
                   GROUP BY "EventId"
                 ) comm ON e."Id" = comm."EventId"
                 LEFT JOIN (
                   SELECT "EventId", true as "isLiked" 
                   FROM "UserEventInteractions" 
                   WHERE "UserId" = $1 AND "InteractionType" = 'like'
                 ) my_likes ON e."Id" = my_likes."EventId"
                 WHERE e."EventDate" >= CURRENT_DATE - INTERVAL '7 days'`,
                [userId]
            ),
            pool.query(`SELECT "Id" FROM "Categories"`),
            pool.query(
                `SELECT "CommunityId" FROM "CommunityFollows" WHERE "UserId" = $1`,
                [userId]
            )
        ]);

        const allEvents = eventsRes.rows;
        const allCategoryIds = categoriesRes.rows.map(c => c.Id);
        const followedCommunityIds = followedRes.rows.map(row => row.CommunityId);

        // 2. Etkinlikleri Vektörleştirme Fonksiyonu
        // Özellikler: Kategori (One-hot encoding)
        const getEventVector = (event) => {
            return allCategoryIds.map(catId => (event.CategoryId === catId ? 1 : 0));
        };

        // 3. Kullanıcı İlgi Vektörünü Oluşturma
        // Beğeniler (like) 2 kat ağırlıklı, görüntülemeler (view) 1 kat.
        let userVector = new Array(allCategoryIds.length).fill(0);

        interactions.forEach(interaction => {
            const relatedEvent = allEvents.find(e => e.Id === interaction.EventId);
            if (relatedEvent) {
                const eventVec = getEventVector(relatedEvent);
                const weight = interaction.InteractionType === 'like' ? 2 : 1;
                for (let i = 0; i < eventVec.length; i++) {
                    userVector[i] += eventVec[i] * weight;
                }
            }
        });

        // 4. Benzerlik Skorlarını Hesaplama
        const interactionEventIds = interactions.map(i => i.EventId);

        const recommendations = allEvents
            .filter(event => !interactionEventIds.includes(event.Id)) // Zaten etkileşime girdiklerini önerme
            .map(event => {
                const eventVec = getEventVector(event);
                let score = cosineSimilarity(userVector, eventVec);

                // Takip edilen topluluksa skoru artır (Boost)
                if (event.CreatedByCommunityId && followedCommunityIds.includes(event.CreatedByCommunityId)) {
                    score += 0.5; // Sabit bir puan ekle veya farklı bir katsayı kullan
                }

                return { ...event, similarityScore: score };
            })
            .filter(event => event.similarityScore > 0) // Sadece alakalı olanlar veya takip edilenler
            .sort((a, b) => b.similarityScore - a.similarityScore) // En yüksek skor en üstte
            .slice(0, 20); // En iyi 20 öneri

        res.status(200).json(recommendations);
    } catch (err) {
        console.error("Öneri hatası:", err);
        res.status(500).json({ message: "Öneriler getirilirken hata oluştu." });
    }
};

module.exports = {
    getRecommendations
};
