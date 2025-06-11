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

    // THAY ĐỔI: Thêm thời gian chi tiết
    playDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Thời gian bắt đầu phải có định dạng HH:MM",
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Thời gian kết thúc phải có định dạng HH:MM",
      },
    },

    // Giữ lại cho tương thích
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

    approvedPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

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

    groupChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupChat",
    },

    interestedPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: ["active", "completed", "expired", "playing"],
      default: "active",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },

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
postSchema.index({ type: 1, status: 1, playDate: 1 });
postSchema.index({ author: 1, createdAt: -1 });

// Virtual để lấy full datetime của trận đấu
postSchema.virtual("playDateTime").get(function () {
  if (!this.playDate || !this.startTime) return null;

  const [hours, minutes] = this.startTime.split(":").map(Number);
  const playDateTime = new Date(this.playDate);
  playDateTime.setHours(hours, minutes, 0, 0);

  return playDateTime;
});

postSchema.virtual("endDateTime").get(function () {
  if (!this.playDate || !this.endTime) return null;

  const [hours, minutes] = this.endTime.split(":").map(Number);
  const endDateTime = new Date(this.playDate);
  endDateTime.setHours(hours, minutes, 0, 0);

  return endDateTime;
});

// Pre-save validation
postSchema.pre("save", function (next) {
  // Cập nhật currentPlayers
  if (this.approvedPlayers) {
    this.currentPlayers = this.approvedPlayers.length;
  }

  // Validate thời gian
  if (this.playDate && this.startTime && this.endTime) {
    const now = new Date();
    const playDateTime = this.playDateTime;
    const endDateTime = this.endDateTime;

    // Không được đăng bài cho thời gian trong quá khứ
    if (playDateTime <= now) {
      const error = new Error("Không thể đăng bài cho thời gian trong quá khứ");
      return next(error);
    }

    // Thời gian kết thúc phải sau thời gian bắt đầu
    if (endDateTime <= playDateTime) {
      const error = new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      return next(error);
    }

    // Tự động cập nhật preferredTime cho tương thích
    const playDateStr = this.playDate.toLocaleDateString("vi-VN");
    this.preferredTime = `${playDateStr} ${this.startTime}-${this.endTime}`;
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

  // Kiểm tra thời gian
  const now = new Date();
  const playDateTime = this.playDateTime;
  const endDateTime = this.endDateTime;

  if (playDateTime && playDateTime <= now) {
    if (endDateTime && now <= endDateTime) {
      return { canJoin: false, reason: "Trận đấu đang diễn ra" };
    } else {
      return { canJoin: false, reason: "Trận đấu đã kết thúc" };
    }
  }

  // Hết hạn đăng ký
  if (this.expiresAt < new Date()) {
    return { canJoin: false, reason: "Bài đăng đã hết hạn đăng ký" };
  }

  // Không hoạt động
  if (this.status !== "active") {
    return { canJoin: false, reason: "Bài đăng không còn hoạt động" };
  }

  return { canJoin: true };
};

// Method để cập nhật trạng thái tự động
postSchema.methods.updateStatus = function () {
  const now = new Date();
  const playDateTime = this.playDateTime;
  const endDateTime = this.endDateTime;

  if (playDateTime && endDateTime) {
    if (now >= endDateTime) {
      this.status = "completed";
    } else if (now >= playDateTime) {
      this.status = "playing";
    }
  }
};

module.exports = mongoose.model("Post", postSchema);
