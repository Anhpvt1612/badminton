const cron = require("node-cron");
const Post = require("../models/Post");

// Chạy mỗi 5 phút để cập nhật trạng thái bài đăng
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("🔄 Đang cập nhật trạng thái bài đăng...");

    const posts = await Post.find({
      status: { $in: ["active", "playing"] },
      playDate: { $exists: true },
      startTime: { $exists: true },
      endTime: { $exists: true },
    });

    let updatedCount = 0;

    for (const post of posts) {
      const oldStatus = post.status;
      post.updateStatus();

      if (post.status !== oldStatus) {
        await post.save();
        updatedCount++;
        console.log(`📝 Post ${post._id}: ${oldStatus} → ${post.status}`);
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Đã cập nhật ${updatedCount} bài đăng`);
    }
  } catch (error) {
    console.error("❌ Lỗi cập nhật trạng thái bài đăng:", error);
  }
});

module.exports = {};
