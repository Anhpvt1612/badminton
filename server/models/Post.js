const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['find_player', 'court_promotion'],
    required: true
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'any'],
    default: 'any'
  },
  location: {
    type: String,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  maxPlayers: {
    type: Number,
    default: 1
  },
  currentPlayers: {
    type: Number,
    default: 1
  },
  interestedPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);