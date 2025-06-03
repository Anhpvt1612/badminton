const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      "topup", // Nạp tiền
      "booking_payment", // Thanh toán booking
      "booking_refund", // Hoàn tiền hủy booking
      "booking_revenue", // Nhận tiền từ booking
      "posting_fee", // Phí đăng sân nổi bật
      "system_fee", // Phí hệ thống (5%)
      "withdrawal", // Rút tiền
    ],
    required: true,
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "completed",
  },
  // THÊM: Số dư trước và sau giao dịch
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  relatedCourt: { type: mongoose.Schema.Types.ObjectId, ref: "Court" },
  orderId: { type: String }, // Cho payment gateway
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
