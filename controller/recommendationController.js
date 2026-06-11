const pool = require("../db/dbConfig");

// ──────────────────────────────────────────────────────────────────────────────
// KOSİNÜS BENZERLİĞİ HESAPLAMA FONKSİYONU
// İki vektör arasındaki açısal benzerliği ölçer. Sonuç 0 ile 1 arasında olur.
//   0 → tamamen farklı ilgi alanları
//   1 → birebir aynı ilgi alanları
//
// Formül: cos(θ) = (A · B) / (|A| × |B|)
//   A · B  = iç çarpım (her indisteki değerlerin çarpımının toplamı)
//   |A|    = A vektörünün büyüklüğü (karekök(Σ Aᵢ²))
//   |B|    = B vektörünün büyüklüğü (karekök(Σ Bᵢ²))
//
// Örnek:
//   Kullanıcı vektörü : [1, 3, 0]  (Müzik sever, Spor biraz, Teknolojiyle ilgisi yok)
//   Müzik etkinliği   : [0, 1, 0]  → cos ≈ 0.95  (yüksek öneri skoru)
//   Spor etkinliği    : [1, 0, 0]  → cos ≈ 0.32  (orta öneri skoru)
//   Teknoloji etkinliği: [0, 0, 1] → cos = 0.00  (filtrelenir, önerilmez)
// ──────────────────────────────────────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0; // İç çarpım: Σ (Aᵢ × Bᵢ)
    let normA = 0;      // vecA'nın büyüklüğünün karesi: Σ Aᵢ²
    let normB = 0;      // vecB'nin büyüklüğünün karesi: Σ Bᵢ²

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]; // Her boyuttaki değerlerin çarpımını topla
        normA += vecA[i] * vecA[i];      // vecA[i]'nin karesini topla
        normB += vecB[i] * vecB[i];      // vecB[i]'nin karesini topla
    }

    // Sıfır vektörüyle işlem yapılamaz (bölme hatası), doğrudan 0 döndür
    if (normA === 0 || normB === 0) return 0;

    // Kosinüs formülünü uygula: iç çarpım / (|A| × |B|)
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ──────────────────────────────────────────────────────────────────────────────
// ANA ÖNERİ FONKSİYONU
// GET /interaction/recommendations — Token doğrulandıktan sonra çalışır.
// Kullanıcının geçmiş etkileşimlerine bakarak ona özel etkinlik listesi döndürür.
// ──────────────────────────────────────────────────────────────────────────────
const getRecommendations = async (req, res) => {
    // JWT middleware tarafından req.user'a atanan kullanıcı ID'si
    const userId = req.user.id;

    try {
        // ── AŞAMA 1: Kullanıcının Geçmiş Etkileşimlerini Çek ──────────────────
        // Bu tabloda; kullanıcının hangi etkinliği beğendiği veya görüntülediği tutulur.
        // InteractionType: "like" (beğeni, ağırlık=2) | "view" (görüntüleme, ağırlık=1)
        const interactionsRes = await pool.query(
            `SELECT * FROM "UserEventInteractions" WHERE "UserId" = $1`,
            [userId]
        );
        const interactions = interactionsRes.rows;

        // ── SOĞUK BAŞLANGIÇ (Cold Start) PROBLEMİ ÇÖZÜMÜ ──────────────────────
        // Yeni kullanıcıların hiç etkileşimi yoktur; öneri algoritması çalışamaz.
        // Bu durumda son 7 günün en yeni etkinlikleri döndürülür (keşif modu).
        if (interactions.length === 0) {
            const latestEvents = await pool.query(
                `SELECT e.*, c."Name" as "CategoryName",
                        COALESCE(uei."LikeCount", 0)::int as "LikeCount",   -- NULL gelirse 0 yap
                        COALESCE(comm."CommentCount", 0)::int as "CommentCount",
                        false as "isLiked"                                   -- Yeni kullanıcı hiç beğenmemiş
                 FROM "Events" e 
                 LEFT JOIN "Categories" c ON e."CategoryId" = c."Id"         -- Kategori adını al
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "LikeCount"                 -- Her etkinlik için toplam beğeni
                   FROM "UserEventInteractions" 
                   WHERE "InteractionType" = 'like'
                   GROUP BY "EventId"
                 ) uei ON e."Id" = uei."EventId"
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "CommentCount"              -- Her etkinlik için toplam yorum
                   FROM "Comments" 
                   GROUP BY "EventId"
                 ) comm ON e."Id" = comm."EventId"
                 WHERE e."EventDate" >= CURRENT_DATE - INTERVAL '7 days'     -- Sadece son 7 günün etkinlikleri
                 ORDER BY e."CreatedDate" DESC LIMIT 20`                     -- En yeniler önce, max 20 adet
            );
            return res.status(200).json(latestEvents.rows); // Fonksiyon burada biter
        }

        // ── AŞAMA 2: 3 Bağımsız Sorguyu Paralel Çalıştır ─────────────────────
        // Promise.all → 3 sorgu sıra beklemeden eş zamanlı çalışır (~%60 hız kazanımı).
        // Sıralı çalışsaydı: T1 + T2 + T3 ms beklenirdi.
        // Paralel çalışınca: max(T1, T2, T3) ms yeterli olur.
        const [eventsRes, categoriesRes, followedRes] = await Promise.all([

            // SORGU 1: Son 7 günün tüm etkinlikleri + beğeni/yorum sayıları + kullanıcının beğenisi
            pool.query(
                `SELECT e.*, c."Name" as "CategoryName",
                        COALESCE(uei."LikeCount", 0)::int as "LikeCount",
                        COALESCE(comm."CommentCount", 0)::int as "CommentCount",
                        COALESCE(my_likes."isLiked", false) as "isLiked"    -- Bu kullanıcı beğendi mi?
                 FROM "Events" e 
                 LEFT JOIN "Categories" c ON e."CategoryId" = c."Id"
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "LikeCount"                 -- Tüm kullanıcıların toplam beğenisi
                   FROM "UserEventInteractions" 
                   WHERE "InteractionType" = 'like'
                   GROUP BY "EventId"
                 ) uei ON e."Id" = uei."EventId"
                 LEFT JOIN (
                   SELECT "EventId", COUNT(*) as "CommentCount"              -- Toplam yorum sayısı
                   FROM "Comments" 
                   GROUP BY "EventId"
                 ) comm ON e."Id" = comm."EventId"
                 LEFT JOIN (
                   SELECT "EventId", true as "isLiked"                       -- Sadece bu kullanıcının beğenileri
                   FROM "UserEventInteractions" 
                   WHERE "UserId" = $1 AND "InteractionType" = 'like'
                 ) my_likes ON e."Id" = my_likes."EventId"
                 WHERE e."EventDate" >= CURRENT_DATE - INTERVAL '7 days'`,
                [userId]
            ),

            // SORGU 2: Tüm kategori ID'leri
            // Bu liste, vektörlerin kaç boyutlu olacağını belirler.
            // Örn: 4 kategori varsa her vektör 4 elemanlı olur → [0, 1, 0, 0]
            pool.query(`SELECT "Id" FROM "Categories"`),

            // SORGU 3: Kullanıcının takip ettiği toplulukların ID'leri
            // Bu toplulukların etkinliklerine sonradan +0.5 bonus puan eklenecek.
            pool.query(
                `SELECT "CommunityId" FROM "CommunityFollows" WHERE "UserId" = $1`,
                [userId]
            )
        ]);

        const allEvents = eventsRes.rows;                                // Tüm etkinlik nesneleri
        const allCategoryIds = categoriesRes.rows.map(c => c.Id);       // [1, 2, 3, 4, ...]
        const followedCommunityIds = followedRes.rows.map(row => row.CommunityId); // [101, 205, ...]

        // ── AŞAMA 3: One-Hot Encoding ile Etkinlik Vektörizasyonu ─────────────
        // Her etkinlik, kategorisine göre bir sayı dizisine (vektöre) dönüştürülür.
        // Etkinliğin kategorisi olan indiste 1, diğerlerinde 0 yazılır.
        //
        // Örnek (4 kategori: Spor=1, Müzik=2, Teknoloji=3, Sanat=4):
        //   Müzik etkinliği → CategoryId=2 → [0, 1, 0, 0]
        //   Spor etkinliği  → CategoryId=1 → [1, 0, 0, 0]
        //
        // İleride bu vektöre konum, etiket, fiyat gibi özellikler de eklenebilir.
        const getEventVector = (event) => {
            return allCategoryIds.map(catId => (event.CategoryId === catId ? 1 : 0));
        };

        // ── AŞAMA 4: Kullanıcı İlgi Vektörü Oluşturma ────────────────────────
        // Kullanıcının tüm geçmiş etkileşimleri birleştirilerek tek bir "ilgi profili" oluşturulur.
        // Beğeniler (like) daha önemli olduğu için 2x, görüntülemeler (view) 1x ağırlık taşır.
        //
        // Adım adım örnek:
        //   Başlangıç userVector: [0, 0, 0]
        //   Müzik beğen  (weight=2): userVector += [0,2,0] → [0, 2, 0]
        //   Spor görüntüle (weight=1): userVector += [1,0,0] → [1, 2, 0]
        //   Müzik görüntüle (weight=1): userVector += [0,1,0] → [1, 3, 0]
        //   Sonuç: Kullanıcı Müziğe (3) > Spora (1) > Teknolojiye (0) ilgi gösteriyor
        let userVector = new Array(allCategoryIds.length).fill(0); // Sıfırlarla başla

        interactions.forEach(interaction => {
            // Bu etkileşimin ait olduğu etkinliği bellekte bul (tekrar DB sorgusu yok)
            const relatedEvent = allEvents.find(e => e.Id === interaction.EventId);
            if (relatedEvent) {
                const eventVec = getEventVector(relatedEvent); // Etkinliğin one-hot vektörü
                const weight = interaction.InteractionType === 'like' ? 2 : 1; // Beğeni=2x, görüntüleme=1x
                for (let i = 0; i < eventVec.length; i++) {
                    userVector[i] += eventVec[i] * weight; // Ağırlıklı olarak kullanıcı vektörüne ekle
                }
            }
        });

        // ── AŞAMA 5: Benzerlik Skorlarını Hesapla ve Sırala ──────────────────
        // Kullanıcının daha önce etkileşime girdiği etkinliklerin ID listesi
        // (Beğendiğin/izlediğin etkinlikleri tekrar önermemek için kullanılır)
        const interactionEventIds = interactions.map(i => i.EventId);

        const recommendations = allEvents
            // Zaten etkileşime girilmiş etkinlikleri çıkar (daha önce görülmüşleri tekrar önerme)
            .filter(event => !interactionEventIds.includes(event.Id))

            .map(event => {
                const eventVec = getEventVector(event); // Adayın vektörü: [0, 1, 0, 0]
                let score = cosineSimilarity(userVector, eventVec); // Benzerlik skoru: 0.0 – 1.0

                // TOPLULUK BOOST: Kullanıcının takip ettiği bir topluluktan gelen etkinliğe
                // +0.5 sabit puan ekle. Bu, takip edilen toplulukların etkinliklerini
                // kategorik benzerlikten bağımsız olarak üst sıralara taşır.
                if (event.CreatedByCommunityId && followedCommunityIds.includes(event.CreatedByCommunityId)) {
                    score += 0.5;
                }

                return { ...event, similarityScore: score }; // Skoru etkinlik nesnesine ekle
            })
            .filter(event => event.similarityScore > 0)              // Sıfır skorlular alakasız → çıkar
            .sort((a, b) => b.similarityScore - a.similarityScore)   // En yüksek skorlu en üstte
            .slice(0, 20);                                           // En iyi 20 öneriyi döndür

        res.status(200).json(recommendations);
    } catch (err) {
        console.error("Öneri hatası:", err);
        res.status(500).json({ message: "Öneriler getirilirken hata oluştu." });
    }
};

module.exports = {
    getRecommendations
};
