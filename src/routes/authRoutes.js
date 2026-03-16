const express = require('express');
const { login, register, registerAdmin } = require('../controllers/authController');
const router = express.Router();

router.post('/login',          login);
router.post('/register',       register);
// ✅ Route admin séparée — protégée par clé secrète dans le body
router.post('/register-admin', registerAdmin);

module.exports = router;