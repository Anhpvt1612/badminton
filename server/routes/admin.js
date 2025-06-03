const express = require("express");
const { adminAuth, auth } = require("../middleware/auth");
const User = require("../models/User");
const Court = require("../models/Court");
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

const router = express.Router();

// Lấy thống kê tổng quan dashboard
router.get("/dashboard", auth, adminAuth, async (req, res) => {
  try {
    console.log("Admin dashboard request from:", req.user.email);

    // Thống kê cơ bản
    const [
      totalUsers,
      totalCourts,
      totalBookings,
      pendingCourts,
      pendingOwners,
      totalTransactions,
    ] = await Promise.all([
      User.countDocuments(),
      Court.countDocuments(),
      Booking.countDocuments(),
      Court.countDocuments({ isApproved: false }),
      User.countDocuments({ role: "owner", isApproved: false }),
      Transaction.countDocuments(),
    ]);

    // Thống kê người dùng theo role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Thống kê sân theo status
    const courtsByStatus = await Court.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Thống kê booking theo status
    const bookingsByStatus = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // SỬA: Thống kê giao dịch và doanh thu admin
    const [
      totalSystemRevenue,
      totalPostingRevenue,
      totalBookingRevenue,
      transactionsByType,
    ] = await Promise.all([
      // Doanh thu phí hệ thống của admin
      Transaction.aggregate([
        { $match: { type: "system_fee_revenue", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Doanh thu phí đăng sân của admin
      Transaction.aggregate([
        { $match: { type: "posting_fee_revenue", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Tổng doanh thu booking của toàn hệ thống
      Booking.aggregate([
        { $match: { status: "confirmed" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Transaction.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // SỬA: Tính tổng doanh thu admin
    const adminTotalRevenue =
      (totalSystemRevenue[0]?.total || 0) +
      (totalPostingRevenue[0]?.total || 0);

    // Doanh thu theo tháng (12 tháng gần nhất)
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          bookings: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" },
            ],
          },
          bookings: 1,
          revenue: 1,
        },
      },
    ]);

    // Giao dịch theo tháng
    const monthlyTransactions = await Transaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            type: "$type",
          },
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Top sân có doanh thu cao nhất
    const topCourts = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: "$court",
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "courts",
          localField: "_id",
          foreignField: "_id",
          as: "court",
        },
      },
      { $unwind: "$court" },
    ]);

    // Top chủ sân có doanh thu cao nhất
    const topOwners = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      {
        $lookup: {
          from: "courts",
          localField: "court",
          foreignField: "_id",
          as: "courtInfo",
        },
      },
      { $unwind: "$courtInfo" },
      {
        $group: {
          _id: "$courtInfo.owner",
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
    ]);

    // Thống kê tăng trưởng so với tháng trước
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentMonthStats = await Promise.all([
      Booking.countDocuments({
        status: "confirmed",
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      Court.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    const lastMonthStats = await Promise.all([
      Booking.countDocuments({
        status: "confirmed",
        createdAt: {
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      Court.countDocuments({
        createdAt: {
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    const dashboardData = {
      // Thống kê cơ bản
      totalUsers,
      totalCourts,
      totalBookings,
      totalTransactions,
      pendingCourts,
      pendingOwners,

      // SỬA: Thống kê doanh thu
      totalSystemRevenue: totalSystemRevenue[0]?.total || 0,
      totalPostingRevenue: totalPostingRevenue[0]?.total || 0,
      totalBookingRevenue: totalBookingRevenue[0]?.total || 0,
      adminTotalRevenue: adminTotalRevenue, // THÊM tổng doanh thu admin

      // Thống kê phân loại
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),

      courtsByStatus: courtsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),

      bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),

      transactionsByType,

      // Dữ liệu biểu đồ
      monthlyRevenue,
      monthlyTransactions,

      // Top lists
      topCourts: topCourts.slice(0, 5),
      topOwners: topOwners.slice(0, 5),

      // Tăng trưởng
      growth: {
        bookings: {
          current: currentMonthStats[0],
          previous: lastMonthStats[0],
          percentage:
            lastMonthStats[0] > 0
              ? (
                  ((currentMonthStats[0] - lastMonthStats[0]) /
                    lastMonthStats[0]) *
                  100
                ).toFixed(1)
              : 0,
        },
        users: {
          current: currentMonthStats[1],
          previous: lastMonthStats[1],
          percentage:
            lastMonthStats[1] > 0
              ? (
                  ((currentMonthStats[1] - lastMonthStats[1]) /
                    lastMonthStats[1]) *
                  100
                ).toFixed(1)
              : 0,
        },
        courts: {
          current: currentMonthStats[2],
          previous: lastMonthStats[2],
          percentage:
            lastMonthStats[2] > 0
              ? (
                  ((currentMonthStats[2] - lastMonthStats[2]) /
                    lastMonthStats[2]) *
                  100
                ).toFixed(1)
              : 0,
        },
      },
    };

    console.log("Dashboard data prepared successfully");
    res.json(dashboardData);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
});

// Lấy danh sách chủ sân với thống kê chi tiết
router.get("/owners", auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = { role: "owner" };

    // Filter theo search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    // Filter theo status
    if (status && status !== "all") {
      if (status === "approved") query.isApproved = true;
      if (status === "pending") query.isApproved = false;
      if (status === "active") query.isActive = true;
      if (status === "suspended") query.isActive = false;
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const owners = await User.find(query)
      .select("-password")
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Lấy thống kê chi tiết cho từng chủ sân
    const ownersWithStats = await Promise.all(
      owners.map(async (owner) => {
        try {
          // Lấy tất cả sân của owner
          const courts = await Court.find({ owner: owner._id });
          const courtIds = courts.map((c) => c._id);

          const [
            totalBookings,
            confirmedBookings,
            totalRevenueResult,
            transactionStats,
            recentBookings,
          ] = await Promise.all([
            Booking.countDocuments({ court: { $in: courtIds } }),
            Booking.countDocuments({
              court: { $in: courtIds },
              status: "confirmed",
            }),
            Booking.aggregate([
              { $match: { court: { $in: courtIds }, status: "confirmed" } },
              { $group: { _id: null, total: { $sum: "$totalPrice" } } },
            ]),
            Transaction.aggregate([
              { $match: { user: owner._id } },
              {
                $group: {
                  _id: "$type",
                  count: { $sum: 1 },
                  totalAmount: { $sum: "$amount" },
                },
              },
            ]),
            Booking.find({ court: { $in: courtIds } })
              .sort({ createdAt: -1 })
              .limit(5)
              .populate("court", "name"),
          ]);

          // Tính toán stats
          const totalCourts = courts.length;
          const approvedCourts = courts.filter((c) => c.isApproved).length;
          const activeCourts = courts.filter(
            (c) => c.status === "active"
          ).length;
          const postedCourts = courts.filter(
            (c) =>
              c.isPosted &&
              c.postingEndDate &&
              new Date(c.postingEndDate) > new Date()
          ).length;

          const totalRevenue = totalRevenueResult[0]?.total || 0;
          const walletBalance = owner.walletBalance || 0;

          // Phân tích giao dịch
          const systemFeesPaid = Math.abs(
            transactionStats.find((t) => t._id === "system_fee")?.totalAmount ||
              0
          );
          const postingFeesPaid = Math.abs(
            transactionStats.find((t) => t._id === "posting_fee")
              ?.totalAmount || 0
          );
          const bookingRevenue =
            transactionStats.find((t) => t._id === "booking_revenue")
              ?.totalAmount || 0;
          const topupAmount =
            transactionStats.find((t) => t._id === "topup")?.totalAmount || 0;

          // Tính tỷ lệ thành công
          const successRate =
            totalBookings > 0
              ? ((confirmedBookings / totalBookings) * 100).toFixed(1)
              : 0;

          // Doanh thu thuần
          const netRevenue = bookingRevenue - systemFeesPaid;

          return {
            ...owner.toObject(),
            stats: {
              totalCourts,
              approvedCourts,
              activeCourts,
              postedCourts,
              totalBookings,
              confirmedBookings,
              totalRevenue,
              netRevenue,
              walletBalance,
              systemFeesPaid,
              postingFeesPaid,
              bookingRevenue,
              topupAmount,
              successRate: parseFloat(successRate),
              averageRevenuePerCourt:
                totalCourts > 0 ? (totalRevenue / totalCourts).toFixed(0) : 0,
              recentBookings: recentBookings.length,
            },
            recentActivity: recentBookings.map((booking) => ({
              courtName: booking.court?.name,
              date: booking.date,
              status: booking.status,
              revenue: booking.totalPrice,
            })),
          };
        } catch (err) {
          console.error(`Error getting stats for owner ${owner._id}:`, err);
          return {
            ...owner.toObject(),
            stats: {
              totalCourts: 0,
              approvedCourts: 0,
              activeCourts: 0,
              postedCourts: 0,
              totalBookings: 0,
              confirmedBookings: 0,
              totalRevenue: 0,
              netRevenue: 0,
              walletBalance: owner.walletBalance || 0,
              systemFeesPaid: 0,
              postingFeesPaid: 0,
              bookingRevenue: 0,
              topupAmount: 0,
              successRate: 0,
              averageRevenuePerCourt: 0,
              recentBookings: 0,
            },
            recentActivity: [],
          };
        }
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      owners: ownersWithStats,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching owners:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy chi tiết giao dịch của chủ sân
router.get(
  "/owners/:ownerId/transactions",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { page = 1, limit = 20, type, startDate, endDate } = req.query;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return res.status(400).json({ message: "ID chủ sân không hợp lệ" });
      }

      let query = { user: ownerId };

      if (type && type !== "all") {
        query.type = type;
      }

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const [transactions, total, owner, summary] = await Promise.all([
        Transaction.find(query)
          .populate("relatedCourt", "name address")
          .populate("relatedBooking", "date startTime endTime")
          .sort({ createdAt: -1 })
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit)),
        Transaction.countDocuments(query),
        User.findById(ownerId).select("-password"),
        Transaction.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
            },
          },
        ]),
      ]);

      if (!owner) {
        return res.status(404).json({ message: "Không tìm thấy chủ sân" });
      }

      res.json({
        owner,
        transactions,
        summary,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          total,
        },
      });
    } catch (error) {
      console.error("Error fetching owner transactions:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  }
);

// Lấy tất cả giao dịch hệ thống
router.get("/transactions", auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      userId,
      status,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};

    // Filters
    if (type && type !== "all") query.type = type;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.user = userId;
    if (status && status !== "all") query.status = status;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [transactions, total, summary] = await Promise.all([
      Transaction.find(query)
        .populate("user", "name email role businessName")
        .populate("relatedCourt", "name address")
        .populate("relatedBooking", "date startTime endTime")
        .sort(sortOptions)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              type: "$type",
              status: "$status",
            },
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    res.json({
      transactions,
      summary,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy danh sách sân với thống kê
router.get("/courts", auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      ownerId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};

    // Filters
    if (status && status !== "all") {
      if (status === "approved") query.isApproved = true;
      if (status === "pending") query.isApproved = false;
      if (status === "active") query.status = "active";
      if (status === "inactive") query.status = "inactive";
      if (status === "posted") query.isPosted = true;
    }

    if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
      query.owner = ownerId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const courts = await Court.find(query)
      .populate("owner", "name email phone businessName")
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Thống kê cho từng sân
    const courtsWithStats = await Promise.all(
      courts.map(async (court) => {
        try {
          const [
            totalBookings,
            confirmedBookings,
            cancelledBookings,
            totalRevenueResult,
            recentBookings,
            averageRating,
          ] = await Promise.all([
            Booking.countDocuments({ court: court._id }),
            Booking.countDocuments({ court: court._id, status: "confirmed" }),
            Booking.countDocuments({ court: court._id, status: "cancelled" }),
            Booking.aggregate([
              { $match: { court: court._id, status: "confirmed" } },
              { $group: { _id: null, total: { $sum: "$totalPrice" } } },
            ]),
            Booking.find({ court: court._id })
              .sort({ createdAt: -1 })
              .limit(5)
              .populate("player", "name"),
            // Giả sử có Review model để tính rating
            // Review.aggregate([
            //   { $match: { court: court._id } },
            //   { $group: { _id: null, avg: { $avg: "$rating" } } }
            // ])
            Promise.resolve([{ avg: court.averageRating || 0 }]),
          ]);

          const totalRevenue = totalRevenueResult[0]?.total || 0;
          const successRate =
            totalBookings > 0
              ? ((confirmedBookings / totalBookings) * 100).toFixed(1)
              : 0;

          return {
            ...court.toObject(),
            stats: {
              totalBookings,
              confirmedBookings,
              cancelledBookings,
              totalRevenue,
              averageRating: averageRating[0]?.avg || 0,
              successRate: parseFloat(successRate),
              utilizationRate: court.isPosted
                ? ((confirmedBookings / (30 * 12)) * 100).toFixed(1)
                : 0, // Giả sử 12 slot/ngày
              isActive: court.status === "active",
              daysSinceCreated: Math.floor(
                (new Date() - court.createdAt) / (1000 * 60 * 60 * 24)
              ),
            },
            recentBookings: recentBookings.map((booking) => ({
              playerName: booking.player?.name,
              date: booking.date,
              status: booking.status,
              revenue: booking.totalPrice,
            })),
          };
        } catch (err) {
          console.error(`Error getting stats for court ${court._id}:`, err);
          return {
            ...court.toObject(),
            stats: {
              totalBookings: 0,
              confirmedBookings: 0,
              cancelledBookings: 0,
              totalRevenue: 0,
              averageRating: 0,
              successRate: 0,
              utilizationRate: 0,
              isActive: false,
              daysSinceCreated: 0,
            },
            recentBookings: [],
          };
        }
      })
    );

    const total = await Court.countDocuments(query);

    res.json({
      courts: courtsWithStats,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching courts:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy danh sách bookings với thống kê
router.get("/bookings", auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      startDate,
      endDate,
      courtId,
      playerId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};

    // Filters
    if (status && status !== "all") query.status = status;
    if (courtId && mongoose.Types.ObjectId.isValid(courtId))
      query.court = courtId;
    if (playerId && mongoose.Types.ObjectId.isValid(playerId))
      query.player = playerId;

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [bookings, total, statusSummary] = await Promise.all([
      Booking.find(query)
        .populate("court", "name address pricePerHour")
        .populate("player", "name phone email")
        .populate({
          path: "court",
          populate: {
            path: "owner",
            select: "name phone email businessName",
          },
        })
        .sort(sortOptions)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      Booking.countDocuments(query),
      Booking.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" },
          },
        },
      ]),
    ]);

    res.json({
      bookings,
      statusSummary,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy danh sách users với thống kê
router.get("/users", auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      role,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let query = {};

    // Filters
    if (role && role !== "all") query.role = role;
    if (status === "active") query.isActive = true;
    if (status === "suspended") query.isActive = false;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const users = await User.find(query)
      .select("-password")
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// === ACTIONS ===

// Duyệt chủ sân
router.put("/approve-owner/:userId", auth, adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        isApproved: true,
        isActive: true, // SỬA: đảm bảo account được kích hoạt khi duyệt
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (user.role !== "owner") {
      return res
        .status(400)
        .json({ message: "Người dùng này không phải chủ sân" });
    }

    res.json({
      message: "Duyệt chủ sân thành công",
      user,
    });
  } catch (error) {
    console.error("Error approving owner:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Duyệt sân
router.put("/approve-court/:courtId", auth, adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.courtId)) {
      return res.status(400).json({ message: "ID sân không hợp lệ" });
    }

    const court = await Court.findByIdAndUpdate(
      req.params.courtId,
      { isApproved: true, status: "active" },
      { new: true }
    ).populate("owner", "name email");

    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    res.json({
      message: "Duyệt sân thành công",
      court,
    });
  } catch (error) {
    console.error("Error approving court:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Từ chối sân
router.put("/reject-court/:courtId", auth, adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        message: "Lý do từ chối phải có ít nhất 10 ký tự",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.courtId)) {
      return res.status(400).json({ message: "ID sân không hợp lệ" });
    }

    const court = await Court.findByIdAndUpdate(
      req.params.courtId,
      {
        isApproved: false,
        status: "rejected",
        rejectionReason: reason.trim(),
      },
      { new: true }
    ).populate("owner", "name email");

    if (!court) {
      return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    res.json({
      message: "Từ chối sân thành công",
      court,
    });
  } catch (error) {
    console.error("Error rejecting court:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Khóa/mở khóa người dùng
router.put("/suspend-user/:userId", auth, adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (user.role === "admin") {
      return res
        .status(400)
        .json({ message: "Không thể khóa tài khoản admin" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `${user.isActive ? "Mở khóa" : "Khóa"} tài khoản thành công`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Xóa người dùng (soft delete)
router.delete("/users/:userId", auth, adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Không thể xóa tài khoản admin" });
    }

    // Soft delete - thêm field deletedAt thay vì xóa thật
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    res.json({ message: "Xóa người dùng thành công" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy báo cáo chi tiết
router.get("/reports", auth, adminAuth, async (req, res) => {
  try {
    const { type = "overview", startDate, endDate } = req.query;

    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    let reportData = {};

    switch (type) {
      case "revenue":
        reportData = await generateRevenueReport(dateQuery);
        break;
      case "users":
        reportData = await generateUserReport(dateQuery);
        break;
      case "courts":
        reportData = await generateCourtReport(dateQuery);
        break;
      case "bookings":
        reportData = await generateBookingReport(dateQuery);
        break;
      default:
        reportData = await generateOverviewReport(dateQuery);
    }

    res.json(reportData);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Lỗi tạo báo cáo", error: error.message });
  }
});

// Helper functions cho reports
async function generateOverviewReport(dateQuery) {
  const [
    totalUsers,
    totalCourts,
    totalBookings,
    totalRevenue,
    totalSystemFees,
  ] = await Promise.all([
    User.countDocuments({ ...dateQuery, role: { $ne: "admin" } }),
    Court.countDocuments(dateQuery),
    Booking.countDocuments(dateQuery),
    Booking.aggregate([
      { $match: { ...dateQuery, status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Transaction.aggregate([
      { $match: { ...dateQuery, type: "system_fee" } },
      { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
    ]),
  ]);

  return {
    summary: {
      totalUsers,
      totalCourts,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalSystemFees: totalSystemFees[0]?.total || 0,
    },
    period: dateQuery.createdAt
      ? `${dateQuery.createdAt.$gte.toISOString().split("T")[0]} - ${
          dateQuery.createdAt.$lte.toISOString().split("T")[0]
        }`
      : "Tất cả thời gian",
  };
}

async function generateRevenueReport(dateQuery) {
  const [bookingRevenue, systemFees, postingFees, dailyRevenue] =
    await Promise.all([
      Booking.aggregate([
        { $match: { ...dateQuery, status: "confirmed" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Transaction.aggregate([
        { $match: { ...dateQuery, type: "system_fee" } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
      ]),
      Transaction.aggregate([
        { $match: { ...dateQuery, type: "posting_fee" } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
      ]),
      Booking.aggregate([
        { $match: { ...dateQuery, status: "confirmed" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalPrice" },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  return {
    summary: {
      totalBookingRevenue: bookingRevenue[0]?.total || 0,
      totalSystemFees: systemFees[0]?.total || 0,
      totalPostingFees: postingFees[0]?.total || 0,
      totalAdminRevenue:
        (systemFees[0]?.total || 0) + (postingFees[0]?.total || 0),
    },
    dailyRevenue,
  };
}

module.exports = router;
