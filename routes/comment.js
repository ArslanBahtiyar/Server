const express = require("express");
const router = express.Router();
const { addComment, getEventComments, deleteComment } = require("../controller/commentController");
const { verifyToken } = require("../middleware/authMiddleware");

// Yorumları Listele (Herkese açık)
router.get("/event/:eventId", getEventComments);

// Yorum Ekle (Giriş zorunlu)
router.post("/add", verifyToken, addComment);

// Yorum Sil (Giriş zorunlu)
router.delete("/delete/:id", verifyToken, deleteComment);

module.exports = router;
