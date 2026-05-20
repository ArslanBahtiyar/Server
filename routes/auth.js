const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    registerCommunity,
    loginCommunity,
    forgotPassword,
    resetPassword,
} = require("../controller/authController");

// Kullanıcı rotaları
router.post("/user/register", registerUser);
router.post("/user/login", loginUser);

// Topluluk rotaları
router.post("/community/register", registerCommunity);
router.post("/community/login", loginCommunity);

// Şifre Sıfırlama rotaları
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
