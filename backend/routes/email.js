// routes/email.js
const express = require('express');
const { testEmail } = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Test email endpoint
router.post('/test', authenticateToken, testEmail);

module.exports = router;