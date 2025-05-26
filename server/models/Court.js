const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  pricePerHour: {
    type: Number,
    required: true
  },
  images: [{
    type: String
  }],
  amenities: [{
    type: String,
    enum: ['parking', 'lighting', 'restroom', 'shower', 'equipment_rental', 'cafe', 'air_conditioning']
  }],
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  rating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Court', courtSchema);
const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  images: [{
    type: String
  }],
  amenities: [{
    type: String
  }],
  openTime: {
    type: String,
    required: true
  },
  closeTime: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Court', courtSchema);
