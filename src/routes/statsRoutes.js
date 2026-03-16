const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { getNationalStats } = require('../controllers/statsController');

const router = express.Router();

router.get('/national', verifyToken, requireAdmin, getNationalStats);

module.exports = router;