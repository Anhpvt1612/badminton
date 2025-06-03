const Booking = require("../models/Booking");
const Review = require("../models/Review");

const checkUserBooking = async (req, res, next) => {
  try {
    const { courtId } = req.params;
    const userId = req.user._id; // Sử dụng _id thay vì id

    console.log("Checking booking for user:", userId, "court:", courtId);

    // Kiểm tra xem user đã từng booking sân này chưa và đã hoàn thành
    const existingBooking = await Booking.findOne({
      user: userId,
      court: courtId,
      status: "completed", // Chỉ những booking đã hoàn thành mới được đánh giá
    });

    console.log("Found completed booking:", existingBooking);

    if (!existingBooking) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn chỉ có thể đánh giá sau khi đã sử dụng dịch vụ của sân này",
      });
    }

    // Kiểm tra xem đã đánh giá cho booking này chưa
    const existingReview = await Review.findOne({
      user: userId,
      court: courtId,
      booking: existingBooking._id,
    });

    console.log("Found existing review:", existingReview);

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đánh giá cho lần booking này rồi",
      });
    }

    req.booking = existingBooking;
    next();
  } catch (error) {
    console.error("Error checking booking:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra booking",
    });
  }
};

module.exports = { checkUserBooking };
