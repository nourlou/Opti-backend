const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const User = require('../models/User');
const fs = require("fs");

// Créer le répertoire des images si inexistant
const imagesDir = path.join(__dirname, "../images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configuration de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    // Remplacer les ":" dans la date par des tirets pour éviter des problèmes sur certains systèmes de fichiers
    cb(null, new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Mise à jour de la route pour prendre en compte les paramètres d'URL : email et "image"
router.post("/:email/image", upload.single("image"), async (req, res) => {
  try {
    console.log('Upload request received:', req.body);

    if (!req.file) {
      console.log('No image uploaded');
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Générer l'URL de l'image
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    console.log('Image uploaded successfully. URL:', imageUrl);

    // Récupérer l'email depuis les paramètres de l'URL
    const email = req.params.email;
    if (email) {
      try {
        console.log(`Updating image URL for user: ${email}`);

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email: email });
        if (user) {
          // Mettre à jour l'image de l'utilisateur
          user.imageUrl = imageUrl;
          await user.save();
          console.log(`User ${email} image URL updated`);
        } else {
          console.log(`User with email ${email} not found - stored image URL: ${imageUrl}`);
        }
      } catch (err) {
        console.error('Error updating user with image URL:', err);
        // On ne renvoie pas l'erreur pour éviter d'échouer complètement la requête d'upload
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
router.put("/:email/image", async (req, res) => {
  try {
    const email = req.params.email;
    const { imageUrl } = req.body;

    console.log(`Updating user image for ${email}: ${imageUrl}`);

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Mettre à jour l'URL de l'image
    user.imageUrl = imageUrl;
    await user.save();

    console.log(`User ${email} image updated successfully.`);
    res.status(200).json({ message: "User image updated successfully" });
  } catch (error) {
    console.error("Error updating user image:", error);
    res.status(500).json({ error: "Failed to update user image" });
  }
});
router.delete("/:email/image", async (req, res) => {
  try {
    const email = req.params.email;

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Vérifier s'il y a une image associée
    if (user.imageUrl) {
      const imagePath = path.join(__dirname, "../images", path.basename(user.imageUrl));

      // Supprimer le fichier si présent
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Image file deleted: ${imagePath}`);
      } else {
        console.log("Image file not found on server.");
      }

      // Mettre à jour l'utilisateur (vider le champ imageUrl)
      user.imageUrl = "";
      await user.save();

      return res.status(200).json({ message: "User image deleted successfully" });
    } else {
      return res.status(400).json({ message: "No image to delete" });
    }
  } catch (error) {
    console.error("Error deleting user image:", error);
    res.status(500).json({ error: "Failed to delete user image" });
  }
});


module.exports = router;
