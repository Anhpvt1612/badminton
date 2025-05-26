const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Post = require('../models/Post');
const router = express.Router();

// Lấy thông tin profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Cập nhật profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, skillLevel, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, skillLevel, location },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật profile' });
  }
});

// Lấy lịch sử đặt sân
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ player: req.user._id })
      .populate('court', 'name address pricePerHour')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy lịch sử đặt sân' });
  }
});

// Lấy danh sách bài đăng của user
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'name skillLevel')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách bài đăng' });
  }
});

module.exports = router;