const express = require('express');
const Review = require('../models/Review');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const router = express.Router();

// Tạo đánh giá mới
router.post('/', auth, async (req, res) => {
  try {
    const { courtId, bookingId, rating, comment } = req.body;

    // Kiểm tra booking có tồn tại và thuộc về user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id,
      status: 'confirmed'
    });

    if (!booking) {
      return res.status(400).json({ message: 'Booking không hợp lệ' });
    }

    // Kiểm tra đã đánh giá chưa
    const existingReview = await Review.findOne({
      court: courtId,
      user: req.user._id,
      booking: bookingId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sân này rồi' });
    }

    const review = new Review({
      court: courtId,
      user: req.user._id,
      booking: bookingId,
      rating,
      comment
    });

    await review.save();
    await review.populate('user', 'name');

    res.status(201).json({
      message: 'Đánh giá thành công',
      review
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy đánh giá của sân
router.get('/court/:courtId', async (req, res) => {
  try {
    const reviews = await Review.find({ court: req.params.courtId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Chủ sân phản hồi đánh giá
router.post('/:reviewId/response', auth, async (req, res) => {
  try {
    const { response } = req.body;
    const review = await Review.findById(req.params.reviewId).populate('court');

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    // Kiểm tra quyền chủ sân
    if (review.court.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền phản hồi' });
    }

    review.ownerResponse = response;
    review.responseDate = new Date();
    await review.save();

    res.json({
      message: 'Phản hồi thành công',
      review
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;