const express = require('express');
const { uploadReport, getUserReports, getAllReports, updateReportStatus } = require('../controllers/reportController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Client — soumettre un rapport
router.post('/upload',       verifyToken,               uploadReport);

// Client — voir ses propres rapports
router.get('/my',            verifyToken,               getUserReports);

// Admin — voir tous les rapports
router.get('/all',           verifyToken, requireAdmin, getAllReports);

// Admin — changer le statut d'un rapport
router.patch('/:id/status',  verifyToken, requireAdmin, updateReportStatus);

module.exports = router;