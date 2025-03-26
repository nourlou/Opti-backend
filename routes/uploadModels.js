// uploadModels.js - Fichier de route pour le téléchargement de modèles 3D
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Model3D = require("../models/Model3D");

// Créer le répertoire pour les modèles 3D
const modelsDir = path.join(__dirname, "../3DModels");
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Configuration multer pour les modèles 3D
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, modelsDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique avec l'extension originale
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('File mimetype:', file.mimetype);
    
    // Autoriser les fichiers GLB et GLTF
    const allowedExtensions = ['.glb', '.gltf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .glb and .gltf files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite plus élevée pour les modèles 3D (50MB)
  },
});

// Route pour uploader un modèle 3D
router.post("/", upload.single("file"), async (req, res) => {
  try {
    console.log('Upload request received:', req.body);
    console.log('File:', req.file);
    
    if (!req.file) {
      console.log('No model uploaded');
      return res.status(400).json({ message: "No model uploaded" });
    }
    
    // Générer le chemin du fichier
    const filePath = `/models/${req.file.filename}`;
    
    // Créer une entrée dans la base de données pour le modèle 3D
    const model3D = new Model3D({
      fileName: req.file.originalname,
      filePath: filePath,
      productId: req.body.productId || '',
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname).substring(1),
      uploadDate: new Date()
    });
    
    await model3D.save();
    
    // Générer l'URL complète
    const modelUrl = `${req.protocol}://${req.get("host")}${filePath}`;
    console.log('Model uploaded successfully. URL:', modelUrl);
    
    res.status(200).json({
      message: "Model uploaded successfully",
      filePath: modelUrl,
      modelId: model3D._id
    });
  } catch (error) {
    console.error('Error uploading model:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;