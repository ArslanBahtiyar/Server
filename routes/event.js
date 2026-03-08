const express = require("express");
const router = express.Router();
const {
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controller/eventController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/create", verifyToken, createEvent);
router.put("/update/:id", verifyToken, updateEvent);
router.delete("/delete/:id", verifyToken, deleteEvent);

module.exports = router;
