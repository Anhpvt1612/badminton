const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { auth } = require("../middleware/auth");
const router = express.Router();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer để upload file
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh!"), false);
    }
  },
});

// Upload ảnh sân
router.post(
  "/court-images",
  auth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: "Không có file nào được tải lên" });
      }

      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "badminton-courts",
                transformation: [{ width: 800, height: 600, crop: "limit" }],
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
              }
            )
            .end(file.buffer);
        });
      });

      const urls = await Promise.all(uploadPromises);

      res.json({
        message: "Tải ảnh thành công",
        urls,
        count: urls.length,
      });
    } catch (error) {
      console.error("Error uploading images:", error);
      res.status(500).json({ message: "Lỗi tải ảnh", error: error.message });
    }
  }
);

module.exports = router;
