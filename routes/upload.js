const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Create the "images" directory if it doesn't exist
const fs = require("fs");
const imagesDir = path.join(__dirname, "../images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const upload = multer({ storage: storage });

// routes/upload.js
router.post("/", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
  
      // Return the image URL
      const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
      res.status(200).json({ 
        message: "Image uploaded successfully",
        imageUrl: imageUrl // Add this line
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;