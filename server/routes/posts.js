const express = require("express");
const { auth } = require("../middleware/auth");
const Post = require("../models/Post");
const GroupChat = require("../models/GroupChat");
const Chat = require("../models/Chat");
const router = express.Router();

// Lấy danh sách bài đăng
router.get("/", async (req, res) => {
  try {
    const { type, skillLevel, location, search } = req.query;
    let query = { status: "active", expiresAt: { $gt: new Date() } };

    if (type) query.type = type;
    if (skillLevel && skillLevel !== "any") query.skillLevel = skillLevel;
    if (location) query.location = { $regex: location, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const posts = await Post.find(query)
      .populate("author", "name skillLevel location")
      .populate("approvedPlayers", "name")
      .populate("pendingRequests.user", "name")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error("GET /api/posts Error:", error);
    res.status(500).json({ message: "Lỗi lấy danh sách bài đăng" });
  }
});

// Tạo bài đăng mới
router.post("/", auth, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      skillLevel,
      location,
      playDate,
      startTime,
      endTime,
      maxPlayers,
      expiresAt,
    } = req.body;

    // Validation
    if (
      !title ||
      !content ||
      !type ||
      !location ||
      !playDate ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc",
        required: [
          "title",
          "content",
          "type",
          "location",
          "playDate",
          "startTime",
          "endTime",
        ],
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        message: "Định dạng thời gian không hợp lệ (HH:MM)",
      });
    }

    // Validate date and time
    const playDateObj = new Date(playDate);
    const now = new Date();

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const playDateTime = new Date(playDateObj);
    playDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(playDateObj);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    if (playDateTime <= now) {
      return res.status(400).json({
        message: "Không thể đăng bài cho thời gian trong quá khứ",
      });
    }

    if (endDateTime <= playDateTime) {
      return res.status(400).json({
        message: "Thời gian kết thúc phải sau thời gian bắt đầu",
      });
    }

    const post = new Post({
      title: title.trim(),
      content: content.trim(),
      author: req.user._id,
      type,
      skillLevel: skillLevel || "any",
      location: location.trim(),
      playDate: playDateObj,
      startTime,
      endTime,
      maxPlayers: maxPlayers || 2,
      approvedPlayers: [req.user._id],
      pendingRequests: [],
      expiresAt: expiresAt
        ? new Date(expiresAt)
        : new Date(playDateTime.getTime() - 2 * 60 * 60 * 1000), // Hết hạn đăng ký 2 tiếng trước khi chơi
    });

    await post.save();

    // Tạo group chat cho bài đăng tìm người chơi
    if (type === "find_player") {
      const groupChat = new GroupChat({
        name: `${title} - Nhóm chat`,
        type: "post_group",
        participants: [req.user._id],
        admin: req.user._id,
        relatedPost: post._id,
      });

      await groupChat.save();
      post.groupChatId = groupChat._id;
      await post.save();

      console.log(
        `✅ Created group chat ${groupChat._id} for post ${post._id}`
      );
    }

    await post.populate("author", "name skillLevel location");
    res.status(201).json(post);
  } catch (error) {
    console.error("POST /api/posts Error:", error);
    res.status(500).json({ message: error.message || "Lỗi tạo bài đăng" });
  }
});

// THÊM: Route join để tương thích với frontend (redirect to request)
router.post("/:id/join", auth, async (req, res) => {
  try {
    const { message } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng" });
    }

    // Sử dụng logic giống request
    const joinCheck = post.canJoin(req.user._id);
    if (!joinCheck.canJoin) {
      return res.status(400).json({ message: joinCheck.reason });
    }

    // Thêm yêu cầu vào danh sách chờ
    post.pendingRequests.push({
      user: req.user._id,
      message: message || "",
      requestedAt: new Date(),
    });

    await post.save();
    await post.populate("author", "name skillLevel location");
    await post.populate("approvedPlayers", "name");
    await post.populate("pendingRequests.user", "name");

    res.json({
      message: "Gửi yêu cầu tham gia thành công! Chờ người đăng duyệt.",
      post,
    });
  } catch (error) {
    console.error("POST /api/posts/:id/join Error:", error);
    res.status(500).json({ message: "Lỗi gửi yêu cầu tham gia" });
  }
});

// YÊU CẦU THAM GIA BÀI ĐĂNG (giữ nguyên cho tương lai)
router.post("/:id/request", auth, async (req, res) => {
  try {
    const { message } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng" });
    }

    const joinCheck = post.canJoin(req.user._id);
    if (!joinCheck.canJoin) {
      return res.status(400).json({ message: joinCheck.reason });
    }

    post.pendingRequests.push({
      user: req.user._id,
      message: message || "",
      requestedAt: new Date(),
    });

    await post.save();
    await post.populate("author", "name skillLevel location");
    await post.populate("approvedPlayers", "name");
    await post.populate("pendingRequests.user", "name");

    res.json({
      message: "Gửi yêu cầu tham gia thành công! Chờ người đăng duyệt.",
      post,
    });
  } catch (error) {
    console.error("POST /api/posts/:id/request Error:", error);
    res.status(500).json({ message: "Lỗi gửi yêu cầu tham gia" });
  }
});

// DUYỆT YÊU CẦU THAM GIA
router.post("/:id/approve/:userId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng" });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ tác giả mới có thể duyệt yêu cầu" });
    }

    const userId = req.params.userId;

    // Tìm yêu cầu
    const requestIndex = post.pendingRequests.findIndex(
      (request) => request.user.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    if (post.approvedPlayers.length >= post.maxPlayers) {
      return res.status(400).json({ message: "Đã đủ số lượng người chơi" });
    }

    // Duyệt yêu cầu
    post.approvedPlayers.push(userId);
    post.pendingRequests.splice(requestIndex, 1);

    // Thêm vào group chat
    if (post.groupChatId) {
      try {
        await GroupChat.findByIdAndUpdate(post.groupChatId, {
          $addToSet: { participants: userId },
        });
        console.log(
          `✅ Added user ${userId} to group chat ${post.groupChatId}`
        );
      } catch (chatError) {
        console.error("Error adding user to group chat:", chatError);
      }
    }

    // Cập nhật trạng thái nếu đủ người
    if (post.approvedPlayers.length >= post.maxPlayers) {
      post.status = "completed";
    }

    await post.save();
    await post.populate("author", "name skillLevel location");
    await post.populate("approvedPlayers", "name");
    await post.populate("pendingRequests.user", "name");

    res.json({
      message: "Duyệt yêu cầu thành công!",
      post,
    });
  } catch (error) {
    console.error("POST /api/posts/:id/approve/:userId Error:", error);
    res.status(500).json({ message: "Lỗi duyệt yêu cầu" });
  }
});

// TỪ CHỐI YÊU CẦU THAM GIA
router.post("/:id/reject/:userId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng" });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ tác giả mới có thể từ chối yêu cầu" });
    }

    const userId = req.params.userId;

    // Tìm và xóa yêu cầu
    const requestIndex = post.pendingRequests.findIndex(
      (request) => request.user.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    post.pendingRequests.splice(requestIndex, 1);
    await post.save();

    res.json({
      message: "Đã từ chối yêu cầu tham gia",
      post,
    });
  } catch (error) {
    console.error("POST /api/posts/:id/reject/:userId Error:", error);
    res.status(500).json({ message: "Lỗi từ chối yêu cầu" });
  }
});

// LẤY DANH SÁCH BÀI ĐĂNG CỦA TÔI (để quản lý yêu cầu)
router.get("/my-posts", auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate("author", "name skillLevel location")
      .populate("approvedPlayers", "name")
      .populate("pendingRequests.user", "name")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error("GET /api/posts/my-posts Error:", error);
    res.status(500).json({ message: "Lỗi lấy bài đăng của tôi" });
  }
});

// THÊM: Route lấy chi tiết bài đăng
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name skillLevel location")
      .populate("approvedPlayers", "name")
      .populate("pendingRequests.user", "name");

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng" });
    }

    // Tăng view count
    post.views = (post.views || 0) + 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error("GET /api/posts/:id Error:", error);
    res.status(500).json({ message: "Lỗi lấy chi tiết bài đăng" });
  }
});

// THÊM: Route xóa bài đăng
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng" });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ tác giả mới có thể xóa bài đăng" });
    }

    // Xóa group chat liên quan
    if (post.groupChatId) {
      try {
        await GroupChat.findByIdAndDelete(post.groupChatId);
        await Chat.deleteMany({ groupChat: post.groupChatId });
        console.log(`✅ Deleted group chat ${post.groupChatId}`);
      } catch (chatError) {
        console.error("Error deleting group chat:", chatError);
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: "Xóa bài đăng thành công" });
  } catch (error) {
    console.error("DELETE /api/posts/:id Error:", error);
    res.status(500).json({ message: "Lỗi xóa bài đăng" });
  }
});

module.exports = router;
