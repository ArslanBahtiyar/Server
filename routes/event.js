const express = require("express");
const router = express.Router();
const {
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getMyEvents,
  getEventById,
} = require("../controller/eventController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/all", getAllEvents);
router.get("/get/:id", getEventById);
router.get("/my-events", verifyToken, getMyEvents);
router.post("/create", verifyToken, createEvent);
router.put("/update/:id", verifyToken, updateEvent);
router.delete("/delete/:id", verifyToken, deleteEvent);

module.exports = router;
