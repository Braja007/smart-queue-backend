const express = require("express");
const router = express.Router();
const { signup } = require("../controllers/authController");
const { signupValidation, validateHandler } = require("../middlewares/validate");

router.post('/signup', signupValidation, validateHandler, signup);

module.exports = router;