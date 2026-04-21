const express = require("express");
const { getEventCategories } = require("../controller/categoryController");

const router = express.Router();

router.get("/types", getEventCategories);

module.exports = router;
