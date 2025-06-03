const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const qs = require("qs");
const { auth } = require("../middleware/auth");
const User = require("../models/User");
const Transaction = require("../models/Transaction"); // THÊM

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// Hàm tạo URL thanh toán VNPay
const createVnpayUrl = (req, amount, orderInfo, orderId, ipAddr) => {
  const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const vnpTmnCode = process.env.VNPAY_TMN_CODE || "GH3E5VUH";
  const vnpHashSecret =
    process.env.VNPAY_SECRET || "TGHRDW9977MIGV71O2383I2E4R9DMRS4";
  const vnpReturnUrl = "http://localhost:5000/api/payment/vnpay_return";
  const createDate = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  let vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: vnpTmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "billpayment",
    vnp_Locale: "vn",
    vnp_ReturnUrl: vnpReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  vnpParams = sortObject(vnpParams);

  const signData = qs.stringify(vnpParams, { encode: false });
  const hmac = crypto.createHmac("sha512", vnpHashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  vnpParams["vnp_SecureHash"] = signed;

  return `${vnpUrl}?${qs.stringify(vnpParams, { encode: false })}`;
};

// API tạo URL thanh toán
router.post("/create_payment_url", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    const orderId = `TXN-${Date.now()}-${req.user._id}`; // Đảm bảo duy nhất
    const orderInfo = `Nạp ${amount} VND vào ví của ${req.user._id}`;
    const ipAddr =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress;

    const paymentUrl = createVnpayUrl(req, amount, orderInfo, orderId, ipAddr);
    res.json({ paymentUrl });
  } catch (error) {
    console.error("Error creating VNPay URL:", error);
    res
      .status(500)
      .json({ message: "Lỗi tạo URL thanh toán", error: error.message });
  }
});

// API xử lý callback từ VNPay
router.get("/vnpay_return", async (req, res) => {
  try {
    let vnpParams = req.query;
    const secureHash = vnpParams["vnp_SecureHash"];
    delete vnpParams["vnp_SecureHash"];
    delete vnpParams["vnp_SecureHashType"];

    vnpParams = sortObject(vnpParams);

    const vnpHashSecret =
      process.env.VNPAY_SECRET || "TGHRDW9977MIGV71O2383I2E4R9DMRS4";
    const signData = qs.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpHashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("Query string:", signData);
    console.log("Calculated hash:", signed);
    console.log("Received secureHash:", secureHash);

    if (secureHash !== signed) {
      return res.redirect("http://localhost:3000/payment/failure?code=97");
    }

    if (vnpParams["vnp_ResponseCode"] === "00") {
      const txnRef = vnpParams["vnp_TxnRef"];
      const userId = txnRef.split("-")[2];
      const amount = parseInt(vnpParams["vnp_Amount"]) / 100;

      console.log("Extracted userId:", userId);
      console.log("Amount to add:", amount);

      if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
        console.error("Invalid userId format:", userId);
        return res.redirect(
          "http://localhost:3000/payment/failure?code=invalid_user_id"
        );
      }

      const user = await User.findById(userId);
      if (!user) {
        console.error("User not found:", userId);
        return res.redirect(
          "http://localhost:3000/payment/failure?code=user_not_found"
        );
      }

      // SỬA: Lưu số dư trước khi cập nhật
      const balanceBefore = user.walletBalance || 0;
      const balanceAfter = balanceBefore + amount;

      // Cập nhật số dư ví
      await User.updateOne(
        { _id: userId },
        { $set: { walletBalance: balanceAfter } }
      );

      // SỬA: Tạo transaction record với số dư trước/sau
      await new Transaction({
        user: userId,
        type: "topup",
        amount: amount,
        description: `Nạp tiền vào ví qua VNPay - ${amount.toLocaleString(
          "vi-VN"
        )}đ`,
        status: "completed",
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        orderId: txnRef,
      }).save();

      console.log(
        `Wallet updated successfully for user: ${userId}`,
        `Balance: ${balanceBefore} -> ${balanceAfter}`
      );
      res.redirect("http://localhost:3000/payment/success");
    } else {
      res.redirect(
        `http://localhost:3000/payment/failure?code=${vnpParams["vnp_ResponseCode"]}`
      );
    }
  } catch (error) {
    console.error("Error in VNPay callback:", error);
    console.error("Error stack:", error.stack);
    res.redirect("http://localhost:3000/payment/failure?code=server_error");
  }
});

module.exports = router;
