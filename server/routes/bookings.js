const express = require("express");
const { auth, ownerAuth } = require("../middleware/auth");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
const Transaction = require("../models/Transaction");
const User = require("../models/User"); // THÊM

// THÊM helper function
const createAdminRevenueTransaction = async (
  amount,
  type,
  description,
  relatedId
) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.error("❌ Admin account not found");
      return;
    }

    const balanceBefore = admin.walletBalance || 0;
    const balanceAfter = balanceBefore + Math.abs(amount);

    admin.walletBalance = balanceAfter;
    await admin.save();

    await new Transaction({
      user: admin._id,
      type: type,
      amount: Math.abs(amount),
      description: description,
      relatedCourt: relatedId,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      status: "completed",
    }).save();

    console.log(
      `✅ Admin revenue: +${amount.toLocaleString("vi-VN")}đ - ${description}`
    );
  } catch (error) {
    console.error("❌ Error creating admin revenue transaction:", error);
  }
};

const router = express.Router();

// SỬA: Route tạo booking
router.post("/", auth, async (req, res) => {
  try {
    const { courtId, date, startTime, endTime, duration, notes } = req.body;

    // Kiểm tra sân có tồn tại
    const court = await Court.findById(courtId).populate("owner");
    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    if (!court.isApproved || court.status !== "active") {
      return res.status(400).json({ message: "Sân không khả dụng" });
    }

    // Tính tổng giá
    const totalPrice = duration * court.pricePerHour;

    // Tạo booking
    const booking = new Booking({
      player: req.user._id,
      court: courtId,
      date: new Date(date),
      startTime,
      endTime,
      duration,
      totalPrice,
      notes,
      status: "confirmed", // Tự động xác nhận
    });

    await booking.save();

    // Tính phí hệ thống (5%)
    const systemFee = Math.round(totalPrice * 0.05);
    const ownerReceive = totalPrice - systemFee;

    const owner = court.owner;
    const ownerBalanceBefore = owner.walletBalance || 0;
    const ownerBalanceAfter = ownerBalanceBefore + ownerReceive;

    // Cập nhật số dư chủ sân (cộng tiền sau khi trừ phí)
    await User.updateOne(
      { _id: owner._id },
      { walletBalance: ownerBalanceAfter }
    );

    // Tạo transaction doanh thu cho owner
    await new Transaction({
      user: owner._id,
      type: "booking_revenue",
      amount: ownerReceive,
      description: `Doanh thu từ booking sân ${court.name} - ${date} ${startTime}-${endTime}`,
      relatedCourt: courtId,
      relatedBooking: booking._id,
      balanceBefore: ownerBalanceBefore,
      balanceAfter: ownerBalanceAfter,
      status: "completed",
    }).save();

    // Trừ phí hệ thống từ owner
    const finalBalance = ownerBalanceAfter - systemFee;
    await User.updateOne({ _id: owner._id }, { walletBalance: finalBalance });

    // Tạo transaction phí hệ thống cho owner
    await new Transaction({
      user: owner._id,
      type: "system_fee",
      amount: -systemFee,
      description: `Phí hệ thống (5%) cho booking sân ${court.name}`,
      relatedCourt: courtId,
      relatedBooking: booking._id,
      balanceBefore: ownerBalanceAfter,
      balanceAfter: finalBalance,
      status: "completed",
    }).save();

    // Tạo doanh thu cho admin
    await createAdminRevenueTransaction(
      systemFee,
      "system_fee_revenue",
      `Phí hệ thống (5%) từ booking sân ${court.name}`,
      courtId
    );

    console.log(
      `✅ Booking created: ${
        court.name
      } - Revenue: ${ownerReceive.toLocaleString(
        "vi-VN"
      )}đ - Fee: ${systemFee.toLocaleString("vi-VN")}đ`
    );

    await booking.populate([
      { path: "court", select: "name address pricePerHour" },
      { path: "player", select: "name phone email" },
    ]);

    res.status(201).json({
      message: "Đặt sân thành công",
      booking,
      fee: {
        totalPrice,
        systemFee,
        ownerReceive,
      },
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({
      message: "Lỗi tạo booking",
      error: error.message,
    });
  }
});

// Lấy danh sách đặt sân của người chơi
router.get("/my-bookings", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ player: req.user._id })
      .populate("court", "name address pricePerHour owner")
      .populate("court.owner", "name phone")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách đặt sân" });
  }
});

// Lấy danh sách đặt sân của chủ sân
router.get("/owner-bookings", auth, ownerAuth, async (req, res) => {
  try {
    const courts = await Court.find({ owner: req.user._id }).select("_id");
    const courtIds = courts.map((court) => court._id);

    const bookings = await Booking.find({ court: { $in: courtIds } })
      .populate("court", "name address")
      .populate("player", "name phone")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách đặt sân" });
  }
});

// // Xác nhận đặt sân (chủ sân)
// router.put("/:id/confirm", ownerAuth, async (req, res) => {
//   return res.status(400).json({ message: "Chức năng xác nhận đã bị vô hiệu hóa. Đặt sân sẽ tự động xác nhận và chuyển tiền." });
// });
//   try {
//     const User = require("../models/User");
//     const booking = await Booking.findById(req.params.id).populate("court");
//     if (!booking) {
//       return res.status(404).json({ message: "Không tìm thấy đặt sân" });
//     }
//     if (booking.court.owner.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: "Không có quyền" });
//     }
//     if (booking.status !== "pending") {
//       return res
//         .status(400)
//         .json({ message: "Chỉ xác nhận đơn ở trạng thái chờ" });
//     }
//     // Cộng tiền vào ví chủ sân (trừ 5% phí)
//     const owner = await User.findById(booking.court.owner);
//     if (!owner) {
//       return res.status(404).json({ message: "Không tìm thấy chủ sân" });
//     }
//     const fee = Math.round(booking.totalPrice * 0.05);
//     const receiveAmount = booking.totalPrice - fee;
//     owner.walletBalance += receiveAmount;
//     await owner.save();
//     booking.status = "confirmed";
//     await booking.save();
//     res.json(booking);
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi xác nhận đặt sân" });
//   }
// });

// Hủy đặt sân
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const User = require("../models/User");
    const { cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id).populate("court");

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đặt sân" });
    }
    // Kiểm tra quyền hủy
    if (booking.player.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Không có quyền hủy đặt sân này" });
    }
    // Kiểm tra thời gian hủy (ví dụ: chỉ được hủy trước 2 giờ)
    const bookingDateTime = new Date(
      `${booking.date.toDateString()} ${booking.startTime}`
    );
    const now = new Date();
    const timeDiff = bookingDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    if (hoursDiff < 2) {
      return res
        .status(400)
        .json({ message: "Chỉ có thể hủy đặt sân trước 2 giờ" });
    }
    // Hoàn tiền về ví người thuê và trừ lại ví chủ sân nếu trạng thái là confirmed
    if (booking.status === "confirmed") {
      const player = await User.findById(booking.player);
      const owner = booking.court
        ? await User.findById(booking.court.owner)
        : null;

      if (player) {
        // SỬA: Lưu số dư trước khi hoàn tiền
        const playerBalanceBefore = player.walletBalance || 0;
        const playerBalanceAfter = playerBalanceBefore + booking.totalPrice;

        player.walletBalance = playerBalanceAfter;
        await player.save();

        // SỬA: Tạo transaction hoàn tiền với số dư
        await new Transaction({
          user: player._id,
          type: "booking_refund",
          amount: booking.totalPrice,
          description: `Hoàn tiền hủy booking sân ${booking.court.name}`,
          relatedBooking: booking._id,
          relatedCourt: booking.court._id,
          balanceBefore: playerBalanceBefore,
          balanceAfter: playerBalanceAfter,
          status: "completed",
        }).save();
      }

      if (owner) {
        const fee = Math.round(booking.totalPrice * 0.05);
        const receiveAmount = booking.totalPrice - fee;

        // SỬA: Lưu số dư trước khi trừ lại
        const ownerBalanceBefore = owner.walletBalance || 0;
        const ownerBalanceAfter = ownerBalanceBefore - receiveAmount;

        owner.walletBalance = ownerBalanceAfter;
        await owner.save();

        // SỬA: Tạo transaction trừ lại tiền với số dư
        await new Transaction({
          user: owner._id,
          type: "booking_refund",
          amount: -receiveAmount,
          description: `Trừ lại tiền do hủy booking sân ${booking.court.name}`,
          relatedBooking: booking._id,
          relatedCourt: booking.court._id,
          balanceBefore: ownerBalanceBefore,
          balanceAfter: ownerBalanceAfter,
          status: "completed",
        }).save();
      }
    }

    booking.status = "cancelled";
    booking.cancellationReason = cancellationReason;
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hủy đặt sân" });
  }
});

module.exports = router;
