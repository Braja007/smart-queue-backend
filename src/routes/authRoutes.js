const express = require("express");
const router = express.Router();
const { signup, login, getMe } = require("../controllers/authController");
const { signupValidation, loginValidation } = require("../middlewares/validate");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);

router.get('/me', verifyToken, getMe);

module.exports = router;