
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

const ownerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Owner only.' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

module.exports = { auth, adminAuth, ownerAuth };
