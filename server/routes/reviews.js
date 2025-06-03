const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Court = require("../models/Court");
const { auth } = require("../middleware/auth");
const { checkUserBooking } = require("../middleware/checkBooking");
const {
  checkProfanity,
  aiProfanityCheck,
} = require("../services/profanityFilter");

// Tạo review mới - chỉ người đã booking
router.post(
  "/courts/:courtId/reviews",
  auth,
  checkUserBooking,
  async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const { courtId } = req.params;
      const userId = req.user._id;
      const booking = req.booking;

      // Validate input
      if (!rating || !comment) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng điền đầy đủ thông tin đánh giá",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Điểm đánh giá phải từ 1 đến 5",
        });
      }

      if (comment.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "Bình luận phải có ít nhất 10 ký tự",
        });
      }

      // Kiểm tra từ ngữ thô tục
      const profanityCheck = checkProfanity(comment);
      const aiCheck = aiProfanityCheck(comment);

      if (profanityCheck.hasProfanity) {
        return res.status(400).json({
          success: false,
          message: "Bình luận chứa từ ngữ không phù hợp",
          details: `Phát hiện: ${profanityCheck.foundWords.join(", ")}`,
          suggestedText: profanityCheck.cleanText,
        });
      }

      if (aiCheck.isSuspicious && aiCheck.confidence > 0.5) {
        return res.status(400).json({
          success: false,
          message: "Bình luận có thể chứa nội dung không phù hợp",
          details: "Vui lòng viết đánh giá một cách lịch sự và xây dựng",
        });
      }

      // Tạo review với booking
      const review = new Review({
        court: courtId,
        user: userId,
        booking: booking._id,
        rating: parseInt(rating),
        comment: profanityCheck.cleanText || comment.trim(),
        reviewType: "booking",
        moderationFlags: {
          hasProfanity: profanityCheck.hasProfanity,
          aiSuspicious: aiCheck.isSuspicious,
        },
      });

      await review.save();

      // Populate thông tin để trả về
      await review.populate("user", "name email");
      await review.populate("booking", "bookingDate startTime endTime");

      // Cập nhật rating trung bình của sân
      await updateCourtRating(courtId);

      res.status(201).json({
        success: true,
        message: "Đánh giá thành công",
        review,
      });
    } catch (error) {
      console.error("Error creating review:", error);

      // Xử lý lỗi duplicate key
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã đánh giá cho booking này rồi",
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo đánh giá",
        error: error.message,
      });
    }
  }
);

// Lấy reviews của một sân
router.get("/courts/:courtId/reviews", async (req, res) => {
  try {
    const { courtId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log("Fetching reviews for court:", courtId);

    // Kiểm tra sân có tồn tại không
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sân",
      });
    }

    const reviews = await Review.find({
      court: courtId,
      isVerified: true,
    })
      .populate("user", "name email")
      .populate("booking", "bookingDate startTime endTime")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Found reviews:", reviews.length);

    const total = await Review.countDocuments({
      court: courtId,
      isVerified: true,
    });

    // Tính điểm trung bình
    const avgRating = await Review.aggregate([
      { $match: { court: courtId, isVerified: true } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);

    res.json({
      success: true,
      reviews,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      averageRating: avgRating[0]?.avgRating || 0,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy đánh giá",
      error: error.message,
    });
  }
});

// Tạo review đơn giản (không cần check booking) - cho test
router.post("/", auth, async (req, res) => {
  try {
    const { courtId, rating, comment } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!courtId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Điểm đánh giá phải từ 1 đến 5",
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Bình luận phải có ít nhất 10 ký tự",
      });
    }

    // Kiểm tra đã review chưa (cho general review)
    const existingReview = await Review.findOne({
      user: userId,
      court: courtId,
      reviewType: "general",
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đánh giá sân này rồi",
      });
    }

    // Kiểm tra từ ngữ thô tục
    const profanityCheck = checkProfanity(comment);
    const aiCheck = aiProfanityCheck(comment);

    if (profanityCheck.hasProfanity) {
      return res.status(400).json({
        success: false,
        message: "Bình luận chứa từ ngữ không phù hợp",
        details: `Phát hiện: ${profanityCheck.foundWords.join(", ")}`,
        suggestedText: profanityCheck.cleanText,
      });
    }

    if (aiCheck.isSuspicious && aiCheck.confidence > 0.5) {
      return res.status(400).json({
        success: false,
        message: "Bình luận có thể chứa nội dung không phù hợp",
        details: "Vui lòng viết đánh giá một cách lịch sự và xây dựng",
      });
    }

    // Tạo review không cần booking
    const review = new Review({
      court: courtId,
      user: userId,
      rating: parseInt(rating),
      comment: profanityCheck.cleanText || comment.trim(),
      reviewType: "general",
      moderationFlags: {
        hasProfanity: profanityCheck.hasProfanity,
        aiSuspicious: aiCheck.isSuspicious,
      },
    });

    await review.save();
    await review.populate("user", "name email");

    // Cập nhật rating trung bình của sân
    await updateCourtRating(courtId);

    res.status(201).json({
      success: true,
      message: "Đánh giá thành công",
      review,
    });
  } catch (error) {
    console.error("Error creating review:", error);

    // Xử lý lỗi duplicate key
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đánh giá sân này rồi",
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo đánh giá",
      error: error.message,
    });
  }
});

// Helper function để cập nhật rating của sân
const updateCourtRating = async (courtId) => {
  try {
    const stats = await Review.aggregate([
      { $match: { court: courtId, isVerified: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Court.findByIdAndUpdate(courtId, {
        averageRating: Math.round(stats[0].avgRating * 10) / 10, // Làm tròn 1 chữ số thập phân
        reviewCount: stats[0].reviewCount,
      });
    }
  } catch (error) {
    console.error("Error updating court rating:", error);
  }
};

module.exports = router;
