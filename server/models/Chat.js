const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    // THÊM: Hỗ trợ cả chat 1-1 và group chat
    chatType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },

    // Cho chat 1-1
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // THÊM: Cho group chat
    groupChat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupChat",
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },

    // THÊM: Cho group - tracking ai đã đọc
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", chatSchema);
