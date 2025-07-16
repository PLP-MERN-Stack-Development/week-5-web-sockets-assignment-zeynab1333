const Room = require('../models/Room');

exports.getRooms = async (req, res) => {
  const rooms = await Room.find().sort({ createdAt: 1 });
  res.json(rooms);
};

exports.createRoom = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Room name is required" });
  const existing = await Room.findOne({ name });
  if (existing) return res.status(400).json({ message: "Room already exists" });
  const room = new Room({ name });
  await room.save();
  res.status(201).json(room);
};
