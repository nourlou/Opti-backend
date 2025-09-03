// uploadProducts.js - Fichier de route pour le téléchargement d'images
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Créer le répertoire des images
const imagesDir = path.join(__dirname, "../ProductImages");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configuration multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('File mimetype:', file.mimetype);
    
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// IMPORTANT: définir explicitement la route pour correspondre au client
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log('Upload request received:', req.body);
    console.log('File:', req.file);
    
    if (!req.file) {
      console.log('No image uploaded');
      return res.status(400).json({ message: "No image uploaded" });
    }
    
    // Générer l'URL de l'image
    const imageUrl = `${req.protocol}://${req.get("host")}/ProductImages/${req.file.filename}`;
    console.log('Image uploaded successfully. URL:', imageUrl);
    
    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;