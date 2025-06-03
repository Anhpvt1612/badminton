// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in auth:", error.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, no user found" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    next();
  } catch (error) {
    console.error("Error in adminAuth:", error.message);
    return res
      .status(401)
      .json({ message: "Not authorized", error: error.message });
  }
};

const ownerAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no user found" });
  }
  
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Owner only." });
  }
  next();
};

module.exports = { auth, adminAuth, ownerAuth };
