const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { uploadProfilePhoto, uploadEventPhoto } = require("../controller/uploadController");

// Multer hata yakalayıcı wrapper
const uploadWrapper = (fn) => (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Dosya boyutu çok büyük. Maksimum 3MB yükleyebilirsiniz." });
      }
      return res.status(400).json({ message: err.message });
    }
    fn(req, res, next);
  });
};

router.post(
  "/profile-photo",
  verifyToken,
  uploadWrapper(uploadProfilePhoto)
);

router.post(
  "/event-photo",
  verifyToken,
  uploadWrapper(uploadEventPhoto)
);

module.exports = router;
