const express = require("express");
const router = express.Router();
const { 
    createService, getAllServices, getServiceById, updateService, deleteService, getServiceStats
} = require("../controllers/serviceController");
const { serviceValidation, updateServiceValidation, validateMongoId } = require("../middlewares/validate");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");

router.post(
    '/create', verifyToken, authorizeRoles('admin'), serviceValidation, createService
);

router.get('/', verifyToken, getAllServices);

router.get('/:id', verifyToken, validateMongoId, getServiceById);
router.get('/:id/stats', verifyToken, authorizeRoles('admin', 'staff'), validateMongoId, getServiceStats );

router.put('/:id', verifyToken, authorizeRoles('admin'), validateMongoId, updateServiceValidation, updateService);
router.delete('/:id', verifyToken, authorizeRoles('admin'), validateMongoId, deleteService);
 
module.exports = router;