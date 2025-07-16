const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');

// Test route (optional, for quick testing)
router.get('/test', (req, res) => {
    res.json({ message: 'Auth route working!' });
});

// Auth routes
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;