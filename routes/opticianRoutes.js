const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Optician = require('../models/opticianModel');
const fs = require("fs");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Add this missing import
const { sendWelcomeEmail } = require('../services/emailService'); // Import the email service
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key'; // Utilisez une variable d'environnement en production

// Create the "images" directory if it doesn't exist
const imagesDir = path.join(__dirname, "../images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configure multer storage
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

// Route for uploading optician image
router.post("/upload-optician-image", upload.single("image"), async (req, res) => {
  try {
    console.log('Upload request received:', req.body);

    if (!req.file) {
      console.log('No image uploaded');
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Generate the image URL
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
    console.log('Image uploaded successfully. URL:', imageUrl);

    // If email is provided, update the optician's image URL
    if (req.body.email) {
      try {
        const email = req.body.email;
        console.log(`Updating image URL for optician: ${email}`);

        // Find the optician by email
        const optician = await Optician.findOne({ email: email });

        if (optician) {
          // Update existing optician
          optician.imageUrl = imageUrl;
          await optician.save();
          console.log(`Optician ${email} image URL updated`);
        } else {
          // Just log that optician was not found, don't try to create one
          console.log(`Optician with email ${email} not found - stored image URL: ${imageUrl}`);
          // No attempt to create optician with missing fields
        }
      } catch (err) {
        console.error('Error updating optician with image URL:', err);
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

// Get all opticians
router.get('/opticians', async (req, res) => {
  try {
    const { email } = req.query;
    let opticians;

    if (email) {
      // If email query parameter is provided, find optician by email
      opticians = await Optician.find({ email: email });
    } else {
      // Otherwise, get all opticians
      opticians = await Optician.find();
    }

    res.status(200).json(opticians);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/opticians', async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel opticien avec le mot de passe haché
    const optician = new Optician({
      ...rest,
      password: hashedPassword,
    });

    const newOptician = await optician.save();

    // Envoyer l'email de bienvenue avec les credentials
    try {
      await sendWelcomeEmail(newOptician);
      console.log(`Email de bienvenue envoyé à ${newOptician.email}`);
    } catch (emailError) {
      console.error(`Échec de l'envoi de l'email à ${newOptician.email}:`, emailError);
      // Ne pas échouer la requête si l'email échoue
    }

    res.status(201).json(newOptician);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an optician
router.put('/opticians/:id', async (req, res) => {
  try {
    const optician = await Optician.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!optician) {
      return res.status(404).json({ message: 'Optician not found' });
    }
    res.status(200).json(optician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an optician
router.delete('/opticians/:id', async (req, res) => {
  try {
    const optician = await Optician.findByIdAndDelete(req.params.id);
    if (!optician) {
      return res.status(404).json({ message: 'Optician not found' });
    }
    res.status(200).json({ message: 'Optician deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const optician = await Optician.findOne({ email });

    if (!optician) {
      console.log(`Optician with email ${email} not found`);
      return res.status(404).json({ message: 'Optician not found' });
    }

    console.log(`Optician found: ${optician.email}`);

    // Vérifier le mot de passe avec bcrypt
    const isMatch = await bcrypt.compare(password, optician.password);
    if (!isMatch) {
      console.log(`Password mismatch for optician ${optician.email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: optician._id,
        email: optician.email,
        nom: optician.nom,
        prenom: optician.prenom
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ token, userId: optician._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;