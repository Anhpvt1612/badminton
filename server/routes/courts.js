const express = require("express");
const { auth, ownerAuth } = require("../middleware/auth");
const Court = require("../models/Court");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const User = require("../models/User"); // THÊM
const Transaction = require("../models/Transaction"); // THÊM

// THÊM helper function ở đầu file
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

// Lấy danh sách tất cả sân
router.get("/", async (req, res) => {
  try {
    const {
      location,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 12,
    } = req.query;
    let query = { isApproved: true, status: "active" };

    // Xử lý tìm kiếm theo location (address, district, hoặc city)
    if (location) {
      query.$or = [
        { address: { $regex: location, $options: "i" } },
        { district: { $regex: location, $options: "i" } },
        { city: { $regex: location, $options: "i" } },
      ];
    }

    // Xử lý tìm kiếm chung (search)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    // Xử lý khoảng giá
    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }
    const courts = await Court.find(query)
      .populate("owner", "name phone")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Court.countDocuments(query);
    res.json({
      courts,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi lấy danh sách sân", error: error.message });
  }
});
// Lấy danh sách sân của chủ sở hữu
router.get("/my-courts", auth, ownerAuth, async (req, res) => {
  try {
    const courts = await Court.find({ owner: req.user._id }).populate(
      "owner",
      "name phone"
    );
    res.json(courts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi lấy danh sách sân của bạn", error: error.message });
  }
});

// Lấy chi tiết sân
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Thêm validation cho ObjectId
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID sân không hợp lệ" });
    }

    const court = await Court.findById(id).populate("owner", "name phone ");

    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    res.json(court);
  } catch (error) {
    console.error("Error fetching court detail:", error);
    res.status(500).json({
      message: "Lỗi lấy thông tin sân",
      error: error.message,
    });
  }
});

// Tạo sân mới (chỉ chủ sân)
router.post("/", auth, ownerAuth, async (req, res) => {
  try {
    const courtData = {
      ...req.body,
      owner: req.user._id,
    };

    const court = new Court(courtData);
    await court.save();

    res.status(201).json(court);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo sân mới" });
  }
});

// Cập nhật sân
router.put("/:id", auth, ownerAuth, async (req, res) => {
  try {
    const court = await Court.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!court) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sân hoặc không có quyền" });
    }

    Object.assign(court, req.body);
    await court.save();

    res.json(court);
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật sân" });
  }
});

// Xóa sân
router.delete("/:id", auth, ownerAuth, async (req, res) => {
  try {
    const court = await Court.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!court) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sân hoặc không có quyền" });
    }

    res.json({ message: "Xóa sân thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa sân" });
  }
});

// Lấy lịch đặt sân của một sân
router.get("/:id/schedule", async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const bookings = await Booking.find({
      court: req.params.id,
      date: { $gte: startDate, $lt: endDate },
      status: { $in: ["confirmed", "pending"] },
    }).select("startTime endTime status");

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy lịch sân" });
  }
});

// Lấy đánh giá của sân
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ court: req.params.id })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy đánh giá" });
  }
});

// Lấy thời gian trống của sân theo ngày
router.get("/:id/available-times", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Thiếu tham số ngày" });
    }

    const court = await Court.findById(req.params.id);
    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    // Lấy các booking đã confirmed trong ngày
    const bookingDate = new Date(date);
    const bookedSlots = await Booking.find({
      court: req.params.id,
      date: bookingDate,
      status: "confirmed",
    }).select("startTime endTime");

    // Chuyển đổi thành danh sách thời gian đã đặt
    const bookedTimes = [];
    bookedSlots.forEach((booking) => {
      const start = booking.startTime;
      const end = booking.endTime;

      // Tạo tất cả các slot 30 phút trong khoảng thời gian đã đặt
      const [startHour, startMinute] = start.split(":").map(Number);
      const [endHour, endMinute] = end.split(":").map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeSlot = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        bookedTimes.push(timeSlot);
      }
    });

    res.json({
      court: court.name,
      date: bookingDate,
      bookedTimes: [...new Set(bookedTimes)], // Loại bỏ duplicate
      bookedSlots: bookedSlots.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    });
  } catch (error) {
    console.error("Error fetching available times:", error);
    res.status(500).json({ message: "Lỗi lấy thời gian trống" });
  }
});

// Đăng sân (Post court)
router.post("/:id/post", auth, ownerAuth, async (req, res) => {
  try {
    const { days } = req.body;
    const courtId = req.params.id;

    // Validate input
    if (!days || days < 1 || days > 30) {
      return res.status(400).json({
        message: "Số ngày phải từ 1 đến 30",
      });
    }

    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    if (court.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền" });
    }

    if (!court.isApproved) {
      return res.status(400).json({ message: "Sân chưa được duyệt" });
    }

    // SỬA: Tính phí (sử dụng dailyPostingFee nếu có, mặc định 100k)
    const dailyFee = court.dailyPostingFee || 100000;
    const totalFee = days * dailyFee;

    const owner = await User.findById(req.user._id);
    if (owner.walletBalance < totalFee) {
      return res.status(400).json({
        message: `Số dư không đủ. Cần ${totalFee.toLocaleString(
          "vi-VN"
        )}đ, hiện có ${owner.walletBalance.toLocaleString("vi-VN")}đ`,
        required: totalFee,
        current: owner.walletBalance,
      });
    }

    // Lưu số dư trước khi trừ tiền
    const balanceBefore = owner.walletBalance;
    const balanceAfter = balanceBefore - totalFee;

    // Trừ tiền owner
    owner.walletBalance = balanceAfter;
    await owner.save();

    // Tạo transaction cho owner
    await new Transaction({
      user: owner._id,
      type: "posting_fee",
      amount: -totalFee,
      description: `Phí đăng sân nổi bật "${court.name}" trong ${days} ngày`,
      relatedCourt: courtId,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      status: "completed",
    }).save();

    // Tạo doanh thu cho admin
    await createAdminRevenueTransaction(
      totalFee,
      "posting_fee_revenue",
      `Doanh thu phí đăng sân "${court.name}" trong ${days} ngày`,
      courtId
    );

    // Cập nhật thông tin đăng sân
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    court.isPosted = true;
    court.postingStartDate = startDate;
    court.postingEndDate = endDate;
    court.postingFee = dailyFee; // SỬA: Lưu phí hàng ngày
    court.lastFeeChargedDate = startDate; // SỬA: Đánh dấu ngày bắt đầu
    await court.save();

    console.log(
      `✅ Court posted: "${
        court.name
      }" for ${days} days - Fee: ${totalFee.toLocaleString("vi-VN")}đ`
    );

    res.json({
      message: `Đăng sân thành công trong ${days} ngày!`,
      court: {
        _id: court._id,
        name: court.name,
        isPosted: court.isPosted,
        postingStartDate: court.postingStartDate,
        postingEndDate: court.postingEndDate,
        dailyFee: dailyFee,
      },
      fee: {
        dailyFee,
        totalFee,
        days,
      },
      remainingBalance: balanceAfter,
    });
  } catch (error) {
    console.error("❌ Error posting court:", error);
    res.status(500).json({
      message: "Lỗi đăng sân",
      error: error.message,
    });
  }
});

// Hủy đăng sân (Unpost court)
router.post("/:id/unpost", auth, ownerAuth, async (req, res) => {
  try {
    const courtId = req.params.id;

    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    // Kiểm tra quyền sở hữu
    if (court.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền" });
    }

    if (!court.isPosted) {
      return res.status(400).json({ message: "Sân chưa được đăng" });
    }

    // Hủy đăng (không hoàn tiền)
    court.isPosted = false;
    court.postingStartDate = null;
    court.postingEndDate = null;
    court.postingFee = 0;
    await court.save();

    res.json({
      message: "Hủy đăng sân thành công!",
      court,
    });
  } catch (error) {
    console.error("Error unposting court:", error);
    res.status(500).json({ message: "Lỗi hủy đăng sân", error: error.message });
  }
});

// Lấy danh sách sân nổi bật (posted courts)
router.get("/featured", async (req, res) => {
  try {
    const featuredCourts = await Court.find({
      isPosted: true,
      isApproved: true,
      status: "active",
      postingEndDate: { $gte: new Date() },
    })
      .populate("owner", "name phone businessName")
      .sort({ postingStartDate: -1 })
      .limit(10);

    res.json(featuredCourts);
  } catch (error) {
    console.error("Error fetching featured courts:", error);
    res.status(500).json({ message: "Lỗi lấy sân nổi bật" });
  }
});

// Lấy danh sách booking của owner
router.get("/owner-bookings", auth, ownerAuth, async (req, res) => {
  try {
    const ownerCourts = await Court.find({ owner: req.user._id }).select("_id");
    const courtIds = ownerCourts.map((court) => court._id);

    const bookings = await Booking.find({
      court: { $in: courtIds },
    })
      .populate([
        { path: "court", select: "name address" },
        { path: "player", select: "name phone email" },
      ])
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching owner bookings:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách booking" });
  }
});

// Lấy dashboard data cho owner
router.get("/owner/dashboard", auth, ownerAuth, async (req, res) => {
  try {
    const ownerId = req.user._id;

    // Lấy tất cả sân của owner
    const courts = await Court.find({ owner: ownerId });
    const courtIds = courts.map((c) => c._id);

    // Lấy tất cả bookings của các sân
    const bookings = await Booking.find({ court: { $in: courtIds } });

    // Tính stats
    const totalCourts = courts.length;
    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Monthly revenue data
    const monthlyRevenue = await Booking.aggregate([
      { $match: { court: { $in: courtIds }, status: "confirmed" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" },
            ],
          },
          revenue: 1,
        },
      },
    ]);

    // Bookings by status
    const bookingsByStatus = [
      {
        name: "Đã xác nhận",
        value: bookings.filter((b) => b.status === "confirmed").length,
      },
      {
        name: "Chờ xác nhận",
        value: bookings.filter((b) => b.status === "pending").length,
      },
      {
        name: "Đã hủy",
        value: bookings.filter((b) => b.status === "cancelled").length,
      },
      {
        name: "Hoàn thành",
        value: bookings.filter((b) => b.status === "completed").length,
      },
    ];

    res.json({
      totalCourts,
      totalBookings,
      totalRevenue,
      monthlyRevenue,
      bookingsByStatus,
    });
  } catch (error) {
    console.error("Error fetching owner dashboard:", error);
    res.status(500).json({ message: "Lỗi tải dashboard" });
  }
});

// Thống kê chi tiết cho từng sân
router.get("/:id/stats", auth, ownerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Kiểm tra quyền sở hữu sân
    const court = await Court.findById(id);
    if (!court || court.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    let dateQuery = { court: id };
    if (startDate && endDate) {
      dateQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Lấy các booking của sân
    const bookings = await Booking.find(dateQuery)
      .populate("player", "name phone email")
      .sort({ date: -1, startTime: -1 });

    // Thống kê tổng quan
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + (b.totalPrice || 0),
      0
    );
    const netRevenue = Math.round(totalRevenue * 0.95); // Trừ 5% phí

    // Thống kê theo ngày
    const dailyStats = await Booking.aggregate([
      { $match: dateQuery },
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          bookings: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    // Thống kê theo giờ (khung giờ nào được thuê nhiều nhất)
    const hourlyStats = await Booking.aggregate([
      { $match: dateQuery },
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: "$startTime",
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Top khách hàng
    const topCustomers = await Booking.aggregate([
      { $match: dateQuery },
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: "$player",
          bookings: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
    ]);

    res.json({
      court: {
        _id: court._id,
        name: court.name,
        address: court.address,
        pricePerHour: court.pricePerHour,
      },
      summary: {
        totalBookings,
        confirmedBookings: confirmedBookings.length,
        cancelledBookings: bookings.filter((b) => b.status === "cancelled")
          .length,
        totalRevenue,
        netRevenue,
        averageBookingValue:
          confirmedBookings.length > 0
            ? Math.round(totalRevenue / confirmedBookings.length)
            : 0,
      },
      recentBookings: bookings.slice(0, 20),
      dailyStats,
      hourlyStats,
      topCustomers,
    });
  } catch (error) {
    console.error("Error fetching court stats:", error);
    res.status(500).json({ message: "Lỗi lấy thống kê sân" });
  }
});

module.exports = router;
