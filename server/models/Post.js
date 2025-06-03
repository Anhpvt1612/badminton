const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["find_player", "court_promotion"],
      required: true,
    },
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "professional", "any"],
    },
    location: {
      type: String,
      required: true,
    },
    preferredTime: {
      type: String,
    },
    maxPlayers: {
      type: Number,
      default: 2,
      min: 2,
      max: 10,
    },
    currentPlayers: {
      type: Number,
      default: 1,
    },

    // THÊM: Danh sách người đã được duyệt
    approvedPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // THÊM: Danh sách yêu cầu chờ duyệt
    pendingRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        message: {
          type: String,
          default: "",
        },
      },
    ],

    // THÊM: Group chat ID cho bài đăng này
    groupChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupChat",
    },

    // Giữ nguyên interestedPlayers cho tương thích (có thể xóa sau)
    interestedPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: ["active", "completed", "expired"],
      default: "active",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    },

    // THÊM: Metadata
    views: {
      type: Number,
      default: 0,
    },
    totalInteractions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index cho tìm kiếm
postSchema.index({ title: "text", content: "text", location: "text" });
postSchema.index({ type: 1, status: 1, expiresAt: 1 });
postSchema.index({ author: 1, createdAt: -1 });

// Virtual để tính số người hiện tại
postSchema.virtual("actualCurrentPlayers").get(function () {
  return this.approvedPlayers ? this.approvedPlayers.length : 1;
});

// Pre-save middleware để cập nhật currentPlayers
postSchema.pre("save", function (next) {
  if (this.approvedPlayers) {
    this.currentPlayers = this.approvedPlayers.length;
  }
  next();
});

// Method để kiểm tra có thể tham gia không
postSchema.methods.canJoin = function (userId) {
  // Không thể tham gia bài đăng của chính mình
  if (this.author.toString() === userId.toString()) {
    return {
      canJoin: false,
      reason: "Không thể tham gia bài đăng của chính mình",
    };
  }

  // Đã được duyệt rồi
  if (this.approvedPlayers.includes(userId)) {
    return { canJoin: false, reason: "Đã được duyệt tham gia rồi" };
  }

  // Đã gửi yêu cầu rồi
  const hasRequest = this.pendingRequests.some(
    (req) => req.user.toString() === userId.toString()
  );
  if (hasRequest) {
    return { canJoin: false, reason: "Đã gửi yêu cầu tham gia rồi" };
  }

  // Đã đủ người
  if (this.approvedPlayers.length >= this.maxPlayers) {
    return { canJoin: false, reason: "Bài đăng đã đủ người" };
  }

  // Hết hạn
  if (this.expiresAt < new Date()) {
    return { canJoin: false, reason: "Bài đăng đã hết hạn" };
  }

  // Không hoạt động
  if (this.status !== "active") {
    return { canJoin: false, reason: "Bài đăng không còn hoạt động" };
  }

  return { canJoin: true };
};

module.exports = mongoose.model("Post", postSchema);
