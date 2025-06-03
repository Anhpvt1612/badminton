const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false, // Không bắt buộc để có thể test
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    response: {
      content: {
        type: String,
        maxlength: 1000,
      },
      respondedAt: Date,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    moderationFlags: {
      hasProfanity: { type: Boolean, default: false },
      aiSuspicious: { type: Boolean, default: false },
      userReported: { type: Boolean, default: false },
    },
    // Thêm trường để phân biệt review có booking hay không
    reviewType: {
      type: String,
      enum: ["booking", "general"],
      default: "general",
    },
  },
  {
    timestamps: true,
  }
);

// Index để đảm bảo mỗi user chỉ review 1 lần cho 1 court (với general review)
reviewSchema.index(
  { user: 1, court: 1, reviewType: 1 },
  {
    unique: true,
    partialFilterExpression: { reviewType: "general" },
  }
);

// Index riêng cho booking review
reviewSchema.index(
  { user: 1, court: 1, booking: 1 },
  {
    unique: true,
    partialFilterExpression: { booking: { $exists: true } },
  }
);

module.exports = mongoose.model("Review", reviewSchema);
