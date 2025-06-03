const express = require("express");
const { auth, ownerAuth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const router = express.Router();

// Lấy lịch sử giao dịch của user
router.get("/my-transactions", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    let query = { user: req.user._id };

    if (type && type !== "all") {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .populate("relatedBooking", "court date startTime endTime")
      .populate("relatedCourt", "name")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Lỗi lấy lịch sử giao dịch" });
  }
});

// Thống kê giao dịch cho owner
router.get("/owner-stats", auth, ownerAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { user: req.user._id };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Tổng hợp theo loại giao dịch
    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Giao dịch theo tháng
    const monthlyStats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            type: "$type",
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    res.json({ stats, monthlyStats });
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res.status(500).json({ message: "Lỗi lấy thống kê giao dịch" });
  }
});

module.exports = router;
