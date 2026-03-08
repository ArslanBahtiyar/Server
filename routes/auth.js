const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    registerCommunity,
    loginCommunity,
} = require("../controller/authController");

// Kullanıcı rotaları
router.post("/user/register", registerUser);
router.post("/user/login", loginUser);

// Topluluk rotaları
router.post("/community/register", registerCommunity);
router.post("/community/login", loginCommunity);

module.exports = router;
