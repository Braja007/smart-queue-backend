const express = require("express");
const router = express.Router();
const { 
    createService, getAllServices, getServiceById, updateService, deleteService, getServiceStats
} = require("../controllers/serviceController");
const { serviceValidation, updateServiceValidation } = require("../middlewares/validate");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");

router.post(
    '/create', verifyToken, authorizeRoles('admin'), serviceValidation, createService
);

router.get('/', verifyToken, getAllServices);

router.get('/:id', verifyToken, getServiceById);
router.get('/:id/stats', verifyToken, authorizeRoles('admin', 'staff'), getServiceStats );

router.put('/:id', verifyToken, authorizeRoles('admin'), updateServiceValidation, updateService);
router.delete('/:id', verifyToken, authorizeRoles('admin'),  deleteService);

module.exports = router;