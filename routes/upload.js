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

router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log('Upload request received:', req.body);

    if (!req.file) {
      console.log('No image uploaded');
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Generate the image URL
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    console.log('Image uploaded successfully. URL:', imageUrl);

    // If email is provided, update the user's image URL
    if (req.body.email) {
      try {
        const email = req.body.email;
        console.log(`Updating image URL for user: ${email}`);

        // Find the user by email
        const user = await User.findOne({ email: email });

        if (user) {
          // Update existing user
          user.imageUrl = imageUrl;
          await user.save();
          console.log(`User ${email} image URL updated`);
        } else {
          // Just log that user was not found, don't try to create one
          console.log(`User with email ${email} not found - stored image URL: ${imageUrl}`);
          // No attempt to create user with missing fields
        }
      } catch (err) {
        console.error('Error updating user with image URL:', err);
        // Don't fail the whole request if this part fails
      }
    }

    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;