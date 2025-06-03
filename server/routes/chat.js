const express = require("express");
const { auth } = require("../middleware/auth");
const Chat = require("../models/Chat");
const GroupChat = require("../models/GroupChat");
const Booking = require("../models/Booking");
const router = express.Router();

// Lấy danh sách cuộc trò chuyện (bao gồm cả 1-1 và group)
router.get("/conversations", auth, async (req, res) => {
  try {
    // Lấy direct chats
    const directChats = await Chat.aggregate([
      {
        $match: {
          chatType: "direct",
          participants: req.user._id,
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: {
                $eq: [{ $arrayElemAt: ["$participants", 0] }, req.user._id],
              },
              then: { $arrayElemAt: ["$participants", 1] },
              else: { $arrayElemAt: ["$participants", 0] },
            },
          },
          lastMessage: { $first: "$$ROOT" },
          chatType: { $first: "direct" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "otherUser",
        },
      },
      {
        $unwind: "$otherUser",
      },
      {
        $project: {
          chatType: 1,
          otherUser: {
            _id: 1,
            name: 1,
            avatar: 1,
          },
          lastMessage: 1,
        },
      },
    ]);

    // Lấy group chats
    const groupChats = await GroupChat.find({
      participants: req.user._id,
    })
      .populate("participants", "name avatar")
      .populate("relatedPost", "title")
      .populate("relatedBooking")
      .sort({ lastMessageAt: -1 });

    const formattedGroupChats = groupChats.map((group) => ({
      _id: group._id,
      chatType: "group",
      groupInfo: {
        name: group.name,
        type: group.type,
        participants: group.participants,
        admin: group.admin,
        relatedPost: group.relatedPost,
        relatedBooking: group.relatedBooking,
      },
      lastMessage: {
        message: group.lastMessage,
        createdAt: group.lastMessageAt,
      },
    }));

    const allConversations = [...directChats, ...formattedGroupChats].sort(
      (a, b) => {
        const aTime = a.lastMessage?.createdAt || a.lastMessage?.updatedAt || 0;
        const bTime = b.lastMessage?.createdAt || b.lastMessage?.updatedAt || 0;
        return new Date(bTime) - new Date(aTime);
      }
    );

    res.json(allConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy tin nhắn 1-1
router.get("/messages/:otherUserId", auth, async (req, res) => {
  try {
    const messages = await Chat.find({
      chatType: "direct",
      participants: { $all: [req.user._id, req.params.otherUserId] },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 })
      .limit(50);

    // Đánh dấu đã đọc
    await Chat.updateMany(
      {
        chatType: "direct",
        participants: { $all: [req.user._id, req.params.otherUserId] },
        sender: req.params.otherUserId,
        isRead: false,
      },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy tin nhắn group
router.get("/group/:groupId/messages", auth, async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.groupId);

    if (!groupChat || !groupChat.participants.includes(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Không có quyền truy cập nhóm chat này" });
    }

    const messages = await Chat.find({
      chatType: "group",
      groupChat: req.params.groupId,
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 })
      .limit(50);

    // Đánh dấu đã đọc cho user hiện tại
    await Chat.updateMany(
      {
        chatType: "group",
        groupChat: req.params.groupId,
        sender: { $ne: req.user._id },
        "readBy.user": { $ne: req.user._id },
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
      }
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Gửi tin nhắn 1-1
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    const chat = new Chat({
      chatType: "direct",
      participants: [req.user._id, receiverId],
      sender: req.user._id,
      message,
    });

    await chat.save();
    await chat.populate("sender", "name avatar");

    res.status(201).json({
      message: "Gửi tin nhắn thành công",
      chat,
    });
  } catch (error) {
    console.error("Error sending direct message:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Gửi tin nhắn group
router.post("/group/:groupId/send", auth, async (req, res) => {
  try {
    const { message } = req.body;
    const groupId = req.params.groupId;

    const groupChat = await GroupChat.findById(groupId);

    if (!groupChat || !groupChat.participants.includes(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Không có quyền gửi tin nhắn vào nhóm này" });
    }

    const chat = new Chat({
      chatType: "group",
      groupChat: groupId,
      sender: req.user._id,
      message,
      readBy: [
        {
          user: req.user._id,
          readAt: new Date(),
        },
      ],
    });

    await chat.save();
    await chat.populate("sender", "name avatar");

    // Cập nhật last message của group
    groupChat.lastMessage = message;
    groupChat.lastMessageAt = new Date();
    await groupChat.save();

    res.status(201).json({
      message: "Gửi tin nhắn thành công",
      chat,
    });
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// TẠO CHAT BOOKING (khi đặt sân)
router.post("/create-booking-chat", auth, async (req, res) => {
  try {
    const { bookingId, ownerId } = req.body;

    // Kiểm tra booking tồn tại và thuộc về user
    const booking = await Booking.findById(bookingId).populate("court");

    if (!booking || booking.player.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Không có quyền tạo chat cho booking này" });
    }

    // Kiểm tra chat đã tồn tại chưa
    let existingChat = await GroupChat.findOne({
      type: "booking_chat",
      relatedBooking: bookingId,
    });

    if (existingChat) {
      return res.json({
        message: "Chat đã tồn tại",
        groupChat: existingChat,
      });
    }

    // Tạo group chat mới
    const groupChat = new GroupChat({
      name: `Đặt sân: ${booking.court.name}`,
      type: "booking_chat",
      participants: [req.user._id, ownerId],
      admin: ownerId, // Chủ sân là admin
      relatedBooking: bookingId,
    });

    await groupChat.save();

    res.status(201).json({
      message: "Tạo chat thành công",
      groupChat,
    });
  } catch (error) {
    console.error("Error creating booking chat:", error);
    res.status(500).json({ message: "Lỗi tạo chat" });
  }
});

// THÊM: API đếm tin nhắn chưa đọc
router.get("/unread-count", auth, async (req, res) => {
  try {
    // Đếm tin nhắn direct chưa đọc
    const unreadDirectCount = await Chat.countDocuments({
      chatType: "direct",
      participants: req.user._id,
      sender: { $ne: req.user._id },
      isRead: false,
    });

    // Đếm tin nhắn group chưa đọc
    const unreadGroupCount = await Chat.countDocuments({
      chatType: "group",
      groupChat: { $in: await getGroupChatIds(req.user._id) },
      sender: { $ne: req.user._id },
      "readBy.user": { $ne: req.user._id },
    });

    const totalUnread = unreadDirectCount + unreadGroupCount;

    res.json({ 
      unreadCount: totalUnread,
      directCount: unreadDirectCount,
      groupCount: unreadGroupCount
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Helper function để lấy group chat IDs của user
const getGroupChatIds = async (userId) => {
  try {
    const groupChats = await GroupChat.find({
      participants: userId
    }).select('_id');
    
    return groupChats.map(gc => gc._id);
  } catch (error) {
    console.error("Error getting group chat IDs:", error);
    return [];
  }
};

// THÊM: API đánh dấu đã đọc tất cả tin nhắn của một conversation
router.post("/mark-all-read/:conversationId", auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { chatType } = req.body;

    if (chatType === "direct") {
      // Đánh dấu đã đọc tin nhắn direct
      await Chat.updateMany(
        {
          chatType: "direct",
          participants: { $all: [req.user._id, conversationId] },
          sender: conversationId,
          isRead: false,
        },
        { isRead: true }
      );
    } else if (chatType === "group") {
      // Đánh dấu đã đọc tin nhắn group
      await Chat.updateMany(
        {
          chatType: "group",
          groupChat: conversationId,
          sender: { $ne: req.user._id },
          "readBy.user": { $ne: req.user._id },
        },
        {
          $push: {
            readBy: {
              user: req.user._id,
              readAt: new Date(),
            },
          },
        }
      );
    }

    res.json({ message: "Đã đánh dấu tất cả tin nhắn là đã đọc" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
