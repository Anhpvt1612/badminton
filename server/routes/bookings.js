const express = require('express');
const { auth, ownerAuth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const router = express.Router();

// Tạo đặt sân mới
router.post('/', auth, async (req, res) => {
  try {
    const { courtId, date, startTime, endTime, duration } = req.body;
    
    // Kiểm tra sân có tồn tại
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ message: 'Không tìm thấy sân' });
    }
    
    // Kiểm tra xem khung giờ đã được đặt chưa
    const existingBooking = await Booking.findOne({
      court: courtId,
      date: new Date(date),
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        }
      ],
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingBooking) {
      return res.status(400).json({ message: 'Khung giờ này đã được đặt' });
    }
    
    const totalPrice = court.pricePerHour * duration;
    
    const booking = new Booking({
      court: courtId,
      player: req.user._id,
      date: new Date(date),
      startTime,
      endTime,
      duration,
      totalPrice
    });
    
    await booking.save();
    await booking.populate('court', 'name address pricePerHour');
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo đặt sân' });
  }
});

// Lấy danh sách đặt sân của người chơi
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ player: req.user._id })
      .populate('court', 'name address pricePerHour owner')
      .populate('court.owner', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đặt sân' });
  }
});

// Lấy danh sách đặt sân của chủ sân
router.get('/owner-bookings', ownerAuth, async (req, res) => {
  try {
    const courts = await Court.find({ owner: req.user._id }).select('_id');
    const courtIds = courts.map(court => court._id);
    
    const bookings = await Booking.find({ court: { $in: courtIds } })
      .populate('court', 'name address')
      .populate('player', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đặt sân' });
  }
});

// Xác nhận đặt sân (chủ sân)
router.put('/:id/confirm', ownerAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('court');
    
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đặt sân' });
    }
    
    if (booking.court.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền' });
    }
    
    booking.status = 'confirmed';
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xác nhận đặt sân' });
  }
});

// Hủy đặt sân
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đặt sân' });
    }
    
    // Kiểm tra quyền hủy
    if (booking.player.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền hủy đặt sân này' });
    }
    
    // Kiểm tra thời gian hủy (ví dụ: chỉ được hủy trước 2 giờ)
    const bookingDateTime = new Date(`${booking.date.toDateString()} ${booking.startTime}`);
    const now = new Date();
    const timeDiff = bookingDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    if (hoursDiff < 2) {
      return res.status(400).json({ message: 'Chỉ có thể hủy đặt sân trước 2 giờ' });
    }
    
    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hủy đặt sân' });
  }
});

module.exports = router;