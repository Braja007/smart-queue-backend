const express = require("express");
const router = express.Router();
const { createService, getAllServices, getServiceById } = require("../controllers/serviceController");
const { serviceValidation } = require("../middlewares/validate");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");

router.post(
    '/create', verifyToken, authorizeRoles('admin'), serviceValidation, createService
);

router.get('/', verifyToken, getAllServices);

router.get('/:id', verifyToken, getServiceById);

module.exports = router;