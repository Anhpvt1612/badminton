const express = require('express');
const { auth, ownerAuth } = require('../middleware/auth');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const router = express.Router();

// Lấy danh sách tất cả sân
router.get('/', async (req, res) => {
  try {
    const { district, city, minPrice, maxPrice, search } = req.query;
    let query = { isApproved: true, status: 'active' };
    
    if (district) query.district = district;
    if (city) query.city = city;
    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    
    const courts = await Court.find(query)
      .populate('owner', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json(courts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách sân' });
  }
});

// Lấy chi tiết sân
router.get('/:id', async (req, res) => {
  try {
    const court = await Court.findById(req.params.id)
      .populate('owner', 'name phone businessName');
    
    if (!court) {
      return res.status(404).json({ message: 'Không tìm thấy sân' });
    }
    
    res.json(court);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin sân' });
  }
});

// Tạo sân mới (chỉ chủ sân)
router.post('/', ownerAuth, async (req, res) => {
  try {
    const courtData = {
      ...req.body,
      owner: req.user._id
    };
    
    const court = new Court(courtData);
    await court.save();
    
    res.status(201).json(court);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo sân mới' });
  }
});

// Cập nhật sân
router.put('/:id', ownerAuth, async (req, res) => {
  try {
    const court = await Court.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!court) {
      return res.status(404).json({ message: 'Không tìm thấy sân hoặc không có quyền' });
    }
    
    Object.assign(court, req.body);
    await court.save();
    
    res.json(court);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật sân' });
  }
});

// Xóa sân
router.delete('/:id', ownerAuth, async (req, res) => {
  try {
    const court = await Court.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    
    if (!court) {
      return res.status(404).json({ message: 'Không tìm thấy sân hoặc không có quyền' });
    }
    
    res.json({ message: 'Xóa sân thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa sân' });
  }
});

// Lấy lịch đặt sân của một sân
router.get('/:id/schedule', async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    const bookings = await Booking.find({
      court: req.params.id,
      date: { $gte: startDate, $lt: endDate },
      status: { $in: ['confirmed', 'pending'] }
    }).select('startTime endTime status');
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy lịch sân' });
  }
});

// Lấy đánh giá của sân
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ court: req.params.id })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy đánh giá' });
  }
});

module.exports = router;