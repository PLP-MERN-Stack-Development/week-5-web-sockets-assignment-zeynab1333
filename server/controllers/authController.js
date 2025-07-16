const User = require('../models/User');

exports.login = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "Username is required" });

  let user = await User.findOne({ username });
  if (!user) {
    user = new User({ username, online: true });
    await user.save();
  } else {
    user.online = true;
    await user.save();
  }
  res.json({ user: { username: user.username, _id: user._id } });
};

exports.logout = async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });
  if (user) {
    user.online = false;
    await user.save();
  }
  res.json({ message: "Logged out" });
};
