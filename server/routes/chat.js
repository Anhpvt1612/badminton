
const express = require('express');
const { auth } = require('../middleware/auth');
const Chat = require('../models/Chat');

const router = express.Router();

// Lấy danh sách cuộc trò chuyện
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Chat.aggregate([
      {
        $match: {
          participants: req.user._id
        }
      },
      {
        $sort: { updatedAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: [{ $arrayElemAt: ['$participants', 0] }, req.user._id] },
              then: { $arrayElemAt: ['$participants', 1] },
              else: { $arrayElemAt: ['$participants', 0] }
            }
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser'
      },
      {
        $project: {
          otherUser: {
            _id: 1,
            name: 1,
            avatar: 1
          },
          lastMessage: 1
        }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy tin nhắn trong cuộc trò chuyện
router.get('/messages/:otherUserId', auth, async (req, res) => {
  try {
    const messages = await Chat.find({
      participants: { $all: [req.user._id, req.params.otherUserId] }
    })
    .populate('sender', 'name')
    .sort({ createdAt: 1 })
    .limit(50);

    // Đánh dấu đã đọc
    await Chat.updateMany(
      {
        participants: { $all: [req.user._id, req.params.otherUserId] },
        sender: req.params.otherUserId,
        isRead: false
      },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Gửi tin nhắn
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    const chat = new Chat({
      participants: [req.user._id, receiverId],
      sender: req.user._id,
      message
    });

    await chat.save();
    await chat.populate('sender', 'name');

    res.status(201).json({
      message: 'Gửi tin nhắn thành công',
      chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
