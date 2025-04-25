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
// Add this route to your uploadModels.js file

// Route pour récupérer tous les modèles 3D
router.get("/", async (req, res) => {
  try {
    // Récupérer tous les modèles de la base de données
    const models = await Model3D.find().sort({ uploadDate: -1 });
    
    // Ajouter les URLs complètes pour chaque modèle
    const modelsWithUrls = models.map(model => {
      const modelUrl = `${req.protocol}://${req.get("host")}${model.filePath}`;
      return {
        ...model.toObject(),
        fullUrl: modelUrl
      };
    });
    
    res.status(200).json({
      message: "Models retrieved successfully",
      models: modelsWithUrls
    });
  } catch (error) {
    console.error('Error retrieving models:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Route pour récupérer un modèle spécifique par ID
router.get("/:id", async (req, res) => {
  try {
    const modelId = req.params.id;
    
    // Récupérer le modèle par ID
    const model = await Model3D.findById(modelId);
    
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }
    
    // Générer l'URL complète
    const modelUrl = `${req.protocol}://${req.get("host")}${model.filePath}`;
    
    res.status(200).json({
      message: "Model retrieved successfully",
      model: {
        ...model.toObject(),
        fullUrl: modelUrl
      }
    });
  } catch (error) {
    console.error('Error retrieving model:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Route pour supprimer un modèle par ID
router.delete("/:id", async (req, res) => {
  try {
    const modelId = req.params.id;
    
    // Récupérer le modèle avant de le supprimer
    const model = await Model3D.findById(modelId);
    
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }
    
    // Chemin du fichier physique
    const filePath = path.join(modelsDir, path.basename(model.filePath));
    
    // Supprimer le fichier physique
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Supprimer l'entrée de la base de données
    await Model3D.findByIdAndDelete(modelId);
    
    res.status(200).json({
      message: "Model deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;