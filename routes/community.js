const express = require("express");
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  followCommunity,
  unfollowCommunity,
  getFollowedCommunities,
} = require("../controller/communityController");
const { verifyToken } = require("../middleware/authMiddleware");

// Sadece "community" rolündeki tokenlara izin ver
const onlyCommunity = (req, res, next) => {
  if (req.user.role !== "community") {
    return res
      .status(403)
      .json({ message: "Bu işlem sadece topluluklara özeldir." });
  }
  next();
};

// Sadece "user" rolündeki tokenlara izin ver
const onlyUser = (req, res, next) => {
  if (req.user.role !== "user") {
    return res
      .status(403)
      .json({ message: "Bu işlem sadece kullanıcılara özeldir." });
  }
  next();
};

router.get("/me", verifyToken, onlyCommunity, getMyProfile);
router.put("/me", verifyToken, onlyCommunity, updateMyProfile);

// Topluluk takip / bırak / listeleme (sadece kullanıcılar)
router.get("/followed", verifyToken, onlyUser, getFollowedCommunities);
router.post("/:communityId/follow", verifyToken, onlyUser, followCommunity);
router.delete("/:communityId/follow", verifyToken, onlyUser, unfollowCommunity);

module.exports = router;

