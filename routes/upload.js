const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");

// Ensure the images directory exists
const imagesDir = path.join(__dirname, "../images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer storage config: save into /images with timestamped filenames
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, imagesDir);
  },
  filename(req, file, cb) {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    cb(null, `${timestamp}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// POST /api/upload/:email/image
router.post("/:email/image", upload.single("image"), async (req, res) => {
  try {
    console.log("Upload request received:", req.params.email);

    // Check that a file was sent
    if (!req.file) {
      console.log("No image uploaded");
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Build the public URL to the saved file
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    console.log("Image uploaded successfully. URL:", imageUrl);

    // Update the user's imageUrl using the email from the URL
    const email = req.params.email;
    const user = await User.findOne({ email });
    if (user) {
      user.imageUrl = imageUrl;
      await user.save();
      console.log(`User ${email} image URL updated`);
    } else {
      console.log(`User with email ${email} not found`);
    }

    // Respond with success and the new URL
    return res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return res.status(500).json({ error: error.message });
  }
});
// In routes/upload.js, below your POST:
router.put("/:email/image", async (req, res) => {
  try {
    const email = req.params.email;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Missing imageUrl in body" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.imageUrl = imageUrl;
    await user.save();
    return res.status(200).json({ message: "User image updated" });
  } catch (err) {
    console.error("Error in PUT /upload/:email/image", err);
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
