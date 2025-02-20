const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Product = require('../models/Product'); // Assuming the Product model

// Créer le dossier "ProductImages" s'il n'existe pas
const fs = require("fs");
const imagesDir = path.join(__dirname, "../ProductImages");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir); // Spécifier le dossier ProductImages pour les téléchargements
  },
  filename: function (req, file, cb) {
    // Renommer le fichier pour garantir des noms uniques
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const upload = multer({ storage: storage });

// Route pour télécharger les images
router.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      console.log('Aucune image téléchargée');
      return res.status(400).json({ message: "Aucune image téléchargée" });
    }

    // Retourner l'URL de l'image relative au dossier ProductImages
    const imageUrl = `${req.protocol}://${req.get("host")}/ProductImage/${req.file.filename}`;
    console.log('Image téléchargée avec succès. URL:', imageUrl);
    res.status(200).json({
      message: "Image téléchargée avec succès",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour mettre à jour l'image d'un produit (en utilisant email ou un autre identifiant)
router.put("/:email/image", async (req, res) => {
  try {
    const { email } = req.params;
    const { imageUrl } = req.body;
    console.log(`Mise à jour de l'image du produit pour l'email: ${email}, imageUrl: ${imageUrl}`);

    // Mettre à jour l'URL de l'image du produit (en supposant que vous utilisez un modèle Product)
    const product = await Product.findOneAndUpdate(
      { email: email }, // Critère de recherche (peut être modifié en fonction de votre modèle)
      { imageUrl: imageUrl },
      { new: true } // Retourner le produit mis à jour
    );

    if (!product) {
      console.log('Produit non trouvé');
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    console.log('Image du produit mise à jour avec succès:', product);
    res.status(200).json({
      message: "Image du produit mise à jour avec succès",
      product: product,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'image du produit:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
