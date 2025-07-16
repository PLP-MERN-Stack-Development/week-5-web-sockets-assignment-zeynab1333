const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
  res.json(messages);
};

exports.createMessage = async (req, res) => {
  const { sender, text } = req.body;
  if (!sender || !text) return res.status(400).json({ message: "Sender and text are required" });

  const message = new Message({ sender, text });
  await message.save();
  res.status(201).json(message);
};
