const express = require("express");
const router = express.Router();
const { logInteraction } = require("../controller/interactionController");
const { getRecommendations } = require("../controller/recommendationController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/log", verifyToken, logInteraction);
router.get("/recommendations", verifyToken, getRecommendations);

module.exports = router;
