const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '/default-avatar.png' },
  status: { type: String, default: 'offline' },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
