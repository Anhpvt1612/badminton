const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: String,
    ref: 'User',
    required: true
  },
  sender: {
    type: String,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['booking_confirmed', 'booking_cancelled', 'new_message', 'court_approved', 'review_received'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);