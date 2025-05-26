const express = require('express');
const { auth } = require('../middleware/auth');
const Post = require('../models/Post');
const router = express.Router();

// Lấy danh sách bài đăng
router.get('/', async (req, res) => {
  try {
    const { type, skillLevel, location, search } = req.query;
    let query = { status: 'active', expiresAt: { $gt: new Date() } };
    
    if (type) query.type = type;
    if (skillLevel && skillLevel !== 'any') query.skillLevel = skillLevel;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await Post.find(query)
      .populate('author', 'name skillLevel location')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách bài đăng' });
  }
});

// Tạo bài đăng mới
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, type, skillLevel, location, preferredTime, maxPlayers, expiresAt } = req.body;
    
    const post = new Post({
      title,
      content,
      author: req.user._id,
      type,
      skillLevel,
      location,
      preferredTime,
      maxPlayers,
      expiresAt: new Date(expiresAt)
    });
    
    await post.save();
    await post.populate('author', 'name skillLevel location');
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo bài đăng' });
  }
});

// Cập nhật bài đăng
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng hoặc không có quyền' });
    }
    
    Object.assign(post, req.body);
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật bài đăng' });
  }
});

// Xóa bài đăng
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng hoặc không có quyền' });
    }
    
    res.json({ message: 'Xóa bài đăng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa bài đăng' });
  }
});

// Tham gia bài đăng tìm bạn chơi
router.post('/:id/join', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }
    
    if (post.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể tham gia bài đăng của chính mình' });
    }
    
    if (post.interestedPlayers.includes(req.user._id)) {
      return res.status(400).json({ message: 'Đã tham gia bài đăng này rồi' });
    }
    
    if (post.currentPlayers >= post.maxPlayers) {
      return res.status(400).json({ message: 'Bài đăng đã đủ người' });
    }
    
    post.interestedPlayers.push(req.user._id);
    post.currentPlayers += 1;
    
    if (post.currentPlayers >= post.maxPlayers) {
      post.status = 'completed';
    }
    
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tham gia bài đăng' });
  }
});

module.exports = router;