const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const User = require('../models/User'); 

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

router.post("/add", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      console.log('No image uploaded');
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Return the image URL
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    console.log('Image uploaded successfully. URL:', imageUrl);
    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:email/image", async (req, res) => {
  try {
    const { email } = req.params;
    const { imageUrl } = req.body;
    console.log(`Updating user image for email: ${email}, imageUrl: ${imageUrl}`);

    // Find the user by email
    const user = await User.findOneAndUpdate(
      { email: email },
      { imageUrl: imageUrl },
      { new: true } // Return the updated user
    );

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: "User not found" });
    }

    console.log('User image updated successfully:', user);
    res.status(200).json({
      message: "User image updated successfully",
      user: user,
    });
  } catch (error) {
    console.error('Error updating user image:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;