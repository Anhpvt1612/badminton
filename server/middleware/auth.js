const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Không có quyền truy cập' });
  }
};

const ownerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ chủ sân hoặc admin mới có quyền truy cập' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Không có quyền truy cập' });
  }
};

module.exports = { auth, adminAuth, ownerAuth };