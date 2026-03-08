const express = require("express");
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
} = require("../controller/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// Sadece "user" rolündeki tokenlara izin ver
const onlyUser = (req, res, next) => {
  if (req.user.role !== "user") {
    return res
      .status(403)
      .json({ message: "Bu işlem sadece kullanıcılara özeldir." });
  }
  next();
};

router.get("/me", verifyToken, onlyUser, getMyProfile);
router.put("/me", verifyToken, onlyUser, updateMyProfile);

module.exports = router;
