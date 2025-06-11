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

    // THÊM: Kiểm tra số dư ví người đặt
    const player = await User.findById(req.user._id);
    if (!player) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const playerBalance = player.walletBalance || 0;
    if (playerBalance < totalPrice) {
      return res.status(400).json({
        message: "Số dư ví không đủ để đặt sân",
        required: totalPrice,
        current: playerBalance,
        shortage: totalPrice - playerBalance,
      });
    }

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

    // THÊM: Trừ tiền từ ví người đặt
    const playerBalanceBefore = playerBalance;
    const playerBalanceAfter = playerBalance - totalPrice;

    await User.updateOne(
      { _id: req.user._id },
      { walletBalance: playerBalanceAfter }
    );

    // THÊM: Tạo transaction trừ tiền cho người đặt
    await new Transaction({
      user: req.user._id,
      type: "booking_payment",
      amount: -totalPrice,
      description: `Thanh toán đặt sân ${court.name} - ${date} ${startTime}-${endTime}`,
      relatedCourt: courtId,
      relatedBooking: booking._id,
      balanceBefore: playerBalanceBefore,
      balanceAfter: playerBalanceAfter,
      status: "completed",
    }).save();

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
    const finalOwnerBalance = ownerBalanceAfter - systemFee;
    await User.updateOne(
      { _id: owner._id },
      { walletBalance: finalOwnerBalance }
    );

    // Tạo transaction phí hệ thống cho owner
    await new Transaction({
      user: owner._id,
      type: "system_fee",
      amount: -systemFee,
      description: `Phí hệ thống (5%) cho booking sân ${court.name}`,
      relatedCourt: courtId,
      relatedBooking: booking._id,
      balanceBefore: ownerBalanceAfter,
      balanceAfter: finalOwnerBalance,
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
      } - Player paid: ${totalPrice.toLocaleString(
        "vi-VN"
      )}đ - Owner received: ${ownerReceive.toLocaleString(
        "vi-VN"
      )}đ - System fee: ${systemFee.toLocaleString("vi-VN")}đ`
    );

    await booking.populate([
      { path: "court", select: "name address pricePerHour" },
      { path: "player", select: "name phone email" },
    ]);

    res.status(201).json({
      message: "Đặt sân thành công",
      booking,
      payment: {
        totalPrice,
        playerPaid: totalPrice,
        playerBalanceAfter,
        ownerReceived: ownerReceive,
        systemFee,
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

// SỬA: Hủy đặt sân - Chỉnh lại logic hoàn tiền
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

    // Hoàn tiền và điều chỉnh số dư nếu trạng thái là confirmed
    if (booking.status === "confirmed") {
      const player = await User.findById(booking.player);
      const owner = booking.court
        ? await User.findById(booking.court.owner)
        : null;

      // Hoàn tiền cho người đặt
      if (player) {
        const playerBalanceBefore = player.walletBalance || 0;
        const playerBalanceAfter = playerBalanceBefore + booking.totalPrice;

        player.walletBalance = playerBalanceAfter;
        await player.save();

        // Tạo transaction hoàn tiền cho người đặt
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

      // Trừ lại tiền từ chủ sân
      if (owner) {
        const systemFee = Math.round(booking.totalPrice * 0.05);
        const ownerReceived = booking.totalPrice - systemFee;

        const ownerBalanceBefore = owner.walletBalance || 0;
        const ownerBalanceAfter = ownerBalanceBefore - ownerReceived;

        owner.walletBalance = ownerBalanceAfter;
        await owner.save();

        // Tạo transaction trừ lại tiền từ chủ sân
        await new Transaction({
          user: owner._id,
          type: "booking_refund_deduction",
          amount: -ownerReceived,
          description: `Trừ lại doanh thu do hủy booking sân ${booking.court.name}`,
          relatedBooking: booking._id,
          relatedCourt: booking.court._id,
          balanceBefore: ownerBalanceBefore,
          balanceAfter: ownerBalanceAfter,
          status: "completed",
        }).save();

        // Hoàn lại phí hệ thống cho chủ sân (cộng lại phí đã trừ)
        const finalOwnerBalance = ownerBalanceAfter + systemFee;
        await User.updateOne(
          { _id: owner._id },
          { walletBalance: finalOwnerBalance }
        );

        await new Transaction({
          user: owner._id,
          type: "system_fee_refund",
          amount: systemFee,
          description: `Hoàn lại phí hệ thống do hủy booking sân ${booking.court.name}`,
          relatedBooking: booking._id,
          relatedCourt: booking.court._id,
          balanceBefore: ownerBalanceAfter,
          balanceAfter: finalOwnerBalance,
          status: "completed",
        }).save();

        // Trừ lại doanh thu từ admin
        const admin = await User.findOne({ role: "admin" });
        if (admin) {
          const adminBalanceBefore = admin.walletBalance || 0;
          const adminBalanceAfter = adminBalanceBefore - systemFee;

          admin.walletBalance = adminBalanceAfter;
          await admin.save();

          await new Transaction({
            user: admin._id,
            type: "system_fee_refund_deduction",
            amount: -systemFee,
            description: `Trừ lại phí hệ thống do hủy booking sân ${booking.court.name}`,
            relatedBooking: booking._id,
            relatedCourt: booking.court._id,
            balanceBefore: adminBalanceBefore,
            balanceAfter: adminBalanceAfter,
            status: "completed",
          }).save();
        }
      }
    }

    booking.status = "cancelled";
    booking.cancellationReason = cancellationReason;
    await booking.save();

    res.json({
      message: "Hủy đặt sân thành công và đã hoàn tiền",
      booking,
    });
  } catch (error) {
    console.error("❌ Error cancelling booking:", error);
    res.status(500).json({ message: "Lỗi hủy đặt sân" });
  }
});

module.exports = router;
