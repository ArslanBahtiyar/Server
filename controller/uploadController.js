const pool = require("../db/dbConfig");

const uploadProfilePhoto = async (req, res) => {
  const { id, role } = req.user;

  console.log("Upload isteği alındı | id:", id, "| role:", role);
  console.log("req.file:", req.file);

  if (!req.file) {
    console.error("req.file boş — multer dosyayı parse edemedi");
    return res.status(400).json({ message: "Dosya bulunamadı." });
  }

  // multer-storage-cloudinary yüklenen dosyanın URL'ini req.file.path'e koyar
  const photoUrl = req.file.path;
  console.log("Cloudinary URL:", photoUrl);

  try {
    if (role === "user") {
      await pool.query(
        `UPDATE "Users" SET "ProfilePhoto" = $1 WHERE "Id" = $2`,
        [photoUrl, id]
      );
    } else if (role === "community") {
      await pool.query(
        `UPDATE "Communities" SET "ProfilePhoto" = $1 WHERE "Id" = $2`,
        [photoUrl, id]
      );
    } else {
      return res.status(403).json({ message: "Geçersiz rol." });
    }

    res.status(200).json({
      message: "Profil fotoğrafı başarıyla güncellendi.",
      url: photoUrl,
    });
  } catch (err) {
    console.error("DB güncelleme hatası:", err.message);
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const uploadEventPhoto = async (req, res) => {
  // Etkinlik fotoğrafları sadece Cloudinary'ye yüklenip linki döner
  // Veritabanına kaydetme işini eventController(createEvent) yapacak
  if (!req.file) {
    return res.status(400).json({ message: "Dosya bulunamadı." });
  }

  res.status(200).json({
    message: "Etkinlik fotoğrafı başarıyla yüklendi.",
    url: req.file.path,
  });
};

module.exports = { uploadProfilePhoto, uploadEventPhoto };
