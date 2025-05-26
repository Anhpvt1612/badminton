const express = require('express');
const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Lấy thống kê tổng quan
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCourts = await Court.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingCourts = await Court.countDocuments({ status: 'pending' });
    const pendingOwners = await User.countDocuments({ role: 'owner', isApproved: false });

    const monthlyBookings = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      totalUsers,
      totalCourts,
      totalBookings,
      pendingCourts,
      pendingOwners,
      monthlyBookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Quản lý người dùng
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Duyệt chủ sân
router.put('/approve-owner/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isApproved: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({
      message: 'Duyệt chủ sân thành công',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Duyệt sân
router.put('/approve-court/:courtId', adminAuth, async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(
      req.params.courtId,
      { status: 'approved' },
      { new: true }
    ).populate('owner', 'name email');

    if (!court) {
      return res.status(404).json({ message: 'Không tìm thấy sân' });
    }

    res.json({
      message: 'Duyệt sân thành công',
      court
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Từ chối sân
router.put('/reject-court/:courtId', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const court = await Court.findByIdAndUpdate(
      req.params.courtId,
      { 
        status: 'rejected',
        rejectionReason: reason
      },
      { new: true }
    ).populate('owner', 'name email');

    if (!court) {
      return res.status(404).json({ message: 'Không tìm thấy sân' });
    }

    res.json({
      message: 'Từ chối sân thành công',
      court
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;