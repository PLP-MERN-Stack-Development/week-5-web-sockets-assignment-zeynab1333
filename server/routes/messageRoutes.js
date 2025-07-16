const express = require('express');
const router = express.Router();
const { getMessages, createMessage } = require('../controllers/messageController');
const Message = require('../models/Message');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Message route working!' });
});

// Get private messages between two users (THIS MUST COME FIRST)
router.get('/private/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: user1, recipient: user2 },
      { sender: user2, recipient: user1 }
    ]
  }).sort({ timestamp: 1 });
  res.json(messages);
});

// Get all messages
router.get('/', getMessages);

// Post a new message
router.post('/', createMessage);

module.exports = router;
