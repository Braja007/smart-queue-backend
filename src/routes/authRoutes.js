const express = require("express");
const router = express.Router();
const { signup } = require("../controllers/authController");
const { signupValidation } = require("../middlewares/validate");

router.post('/signup', signupValidation, signup);

module.exports = router;