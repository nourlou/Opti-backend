const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Product = require('../models/Product'); // Assuming the Product model exists
const fs = require("fs");

// Create the "ProductImages" directory if it doesn't exist
const imagesDir = path.join(__dirname, "../ProductImages");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir); // Save files to the "ProductImages" directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + path.extname(file.originalname)); // Unique filename
  }
});

const upload = multer({ storage: storage });

// Route to upload an image
router.post("/upload", upload.single("image"), (req, res) => {
  console.log("Requête d'upload reçue");
  try {
    if (!req.file) {
      console.log("Aucun fichier reçu");
      return res.status(400).json({ message: "Aucune image téléchargée" });
    }

    console.log("Fichier reçu:", req.file);

    // Generate the full URL for the uploaded image
    const imageUrl = `${req.protocol}://${req.get("host")}/ProductImages/${req.file.filename}`;
    console.log("URL générée:", imageUrl);

    res.status(200).json({
      message: "Image téléchargée avec succès",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to update a product's image (using email or another identifier)
router.put("/:email/image", async (req, res) => {
  try {
    const { email } = req.params;
    const { imageUrl } = req.body;
    console.log(`Mise à jour de l'image du produit pour l'email: ${email}, imageUrl: ${imageUrl}`);

    // Update the product's image URL (assuming you're using a Product model)
    const product = await Product.findOneAndUpdate(
      { email: email }, // Search criteria (can be modified based on your model)
      { imageUrl: imageUrl },
      { new: true } // Return the updated product
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