const cron = require("node-cron");
const Court = require("../models/Court");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");

// THÊM: Helper function tạo doanh thu cho admin
const createAdminRevenueTransaction = async (
  amount,
  type,
  description,
  relatedId
) => {
  try {
    // Tìm admin account
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.error("❌ Admin account not found");
      return;
    }

    const balanceBefore = admin.walletBalance || 0;
    const balanceAfter = balanceBefore + Math.abs(amount);

    // Cập nhật số dư admin
    admin.walletBalance = balanceAfter;
    await admin.save();

    // Tạo transaction cho admin
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

// Chạy mỗi ngày lúc 00:01
const startDailyFeeCharge = () => {
  cron.schedule(
    "1 0 * * *",
    async () => {
      console.log("🔄 Starting daily posting fee charge...");

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Lấy tất cả sân đang được đăng
        const postedCourts = await Court.find({
          isPosted: true,
          postingEndDate: { $gte: today },
        }).populate("owner");

        let totalProcessed = 0;
        let totalCharged = 0;
        let totalStopped = 0;
        let totalRevenue = 0;

        console.log(`📊 Found ${postedCourts.length} posted courts to process`);

        for (const court of postedCourts) {
          try {
            // Kiểm tra xem hôm nay đã trừ phí chưa
            const lastChargedDate =
              court.lastFeeChargedDate || court.postingStartDate;
            const lastChargedDay = new Date(lastChargedDate);
            lastChargedDay.setHours(0, 0, 0, 0);

            // Nếu đã trừ phí hôm nay thì bỏ qua
            if (lastChargedDay.getTime() === today.getTime()) {
              console.log(`⏭️ Court "${court.name}" already charged today`);
              continue;
            }

            const owner = await User.findById(court.owner);
            if (!owner) {
              console.log(`❌ Owner not found for court "${court.name}"`);
              continue;
            }

            // SỬA: Sử dụng dailyPostingFee từ Court model, mặc định 100k
            const dailyFee = court.dailyPostingFee || 100000;

            console.log(
              `💰 Processing court "${
                court.name
              }" - Fee: ${dailyFee.toLocaleString(
                "vi-VN"
              )}đ - Owner balance: ${owner.walletBalance.toLocaleString(
                "vi-VN"
              )}đ`
            );

            // Kiểm tra số dư ví
            if (owner.walletBalance >= dailyFee) {
              // Lưu số dư trước khi trừ tiền
              const balanceBefore = owner.walletBalance;
              const balanceAfter = balanceBefore - dailyFee;

              // Trừ tiền owner
              owner.walletBalance = balanceAfter;
              await owner.save();

              // Tạo transaction cho owner (trừ tiền)
              await new Transaction({
                user: owner._id,
                type: "posting_fee",
                amount: -dailyFee,
                description: `Phí duy trì sân nổi bật "${
                  court.name
                }" - ${today.toLocaleDateString("vi-VN")}`,
                relatedCourt: court._id,
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter,
                status: "completed",
              }).save();

              // Tạo doanh thu cho admin
              await createAdminRevenueTransaction(
                dailyFee,
                "posting_fee_revenue",
                `Phí duy trì sân "${court.name}" - ${today.toLocaleDateString(
                  "vi-VN"
                )}`,
                court._id
              );

              // Cập nhật court
              court.lastFeeChargedDate = today;
              court.totalPostingFee = (court.totalPostingFee || 0) + dailyFee;
              await court.save();

              // Tạo thông báo cho owner
              await Notification.create({
                recipient: owner._id,
                type: "court_fee_charged",
                title: "Phí duy trì sân hàng ngày",
                message: `Đã trừ ${dailyFee.toLocaleString(
                  "vi-VN"
                )}đ phí duy trì sân "${
                  court.name
                }" cho ngày ${today.toLocaleDateString(
                  "vi-VN"
                )}. Số dư còn lại: ${balanceAfter.toLocaleString("vi-VN")}đ`,
                relatedId: court._id,
              });

              totalCharged++;
              totalRevenue += dailyFee;
              console.log(
                `✅ Charged ${dailyFee.toLocaleString("vi-VN")}đ for court: "${
                  court.name
                }"`
              );
            } else {
              // Số dư không đủ - dừng đăng sân
              court.isPosted = false;
              court.postingEndDate = today;
              await court.save();

              // Thông báo dừng đăng
              await Notification.create({
                recipient: owner._id,
                type: "court_posting_stopped",
                title: "Dừng đăng sân do hết tiền",
                message: `Sân "${
                  court.name
                }" đã dừng đăng do số dư ví không đủ trả phí ${dailyFee.toLocaleString(
                  "vi-VN"
                )}đ. Số dư hiện tại: ${owner.walletBalance.toLocaleString(
                  "vi-VN"
                )}đ`,
                relatedId: court._id,
              });

              totalStopped++;
              console.log(
                `❌ Stopped posting for court: "${
                  court.name
                }" (insufficient balance: ${owner.walletBalance.toLocaleString(
                  "vi-VN"
                )}đ < ${dailyFee.toLocaleString("vi-VN")}đ)`
              );
            }

            totalProcessed++;
          } catch (error) {
            console.error(`❌ Error processing court ${court._id}:`, error);
          }
        }

        console.log(`✅ Daily fee charge completed:
        📊 Total processed: ${totalProcessed} courts
        💰 Successfully charged: ${totalCharged} courts
        💵 Total revenue collected: ${totalRevenue.toLocaleString("vi-VN")}đ
        ⛔ Stopped posting: ${totalStopped} courts
        🕐 Completed at: ${new Date().toLocaleString("vi-VN")}
      `);
      } catch (error) {
        console.error("❌ Error in daily fee charge:", error);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    }
  );

  console.log("🕐 Daily fee charge scheduler started (runs at 00:01 daily)");
};

// THÊM function test (chỉ để test, sau này có thể xóa)
const testDailyFeeCharge = async () => {
  console.log("🧪 Testing daily fee charge manually...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const postedCourts = await Court.find({
    isPosted: true,
    postingEndDate: { $gte: today },
  }).populate("owner");

  console.log(`📊 Found ${postedCourts.length} posted courts for testing`);

  for (const court of postedCourts) {
    const owner = await User.findById(court.owner);
    const dailyFee = court.dailyPostingFee || 100000;

    console.log(
      `🔍 Court: "${court.name}" - Daily fee: ${dailyFee.toLocaleString(
        "vi-VN"
      )}đ - Owner balance: ${owner.walletBalance.toLocaleString("vi-VN")}đ`
    );
  }
};

module.exports = { startDailyFeeCharge, testDailyFeeCharge };
