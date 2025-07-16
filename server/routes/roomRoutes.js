const express = require('express');
const router = express.Router();
const { getRooms, createRoom } = require('../controllers/roomController');

// Get all rooms
router.get('/', getRooms);

// Create a new room
router.post('/', createRoom);

module.exports = router;
