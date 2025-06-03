const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    pricePerHour: {
      type: Number,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    amenities: [
      {
        type: String,
        enum: [
          "parking",
          "lighting",
          "restroom",
          "shower",
          "equipment_rental",
          "cafe",
          "air_conditioning",
          "wifi",
          "security",
          "firstAid",
          "lockers",
        ],
      },
    ],
    openTime: {
      type: String,
      required: true,
    },
    closeTime: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    // Thêm các field mới cho posting fee
    isPosted: { type: Boolean, default: false },
    postingStartDate: { type: Date },
    postingEndDate: { type: Date },
    postingFee: { type: Number, default: 100000 }, // 100k/ngày
    dailyPostingFee: { type: Number, default: 100000 },
    lastFeeChargedDate: { type: Date }, // THÊM field này - QUAN TRỌNG
    totalPostingFee: { type: Number, default: 0 }, // THÊM field này

    // Thống kê
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Court", courtSchema);
