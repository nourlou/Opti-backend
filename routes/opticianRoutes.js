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
const nodemailer = require('nodemailer');

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

// Email configuration (same as your provided transporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yosrbencheikh28@gmail.com',
    pass: 'xqzc yhwk kdvi pmdy',
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Error in email transporter configuration:', error);
  } else {
    console.log('Email transporter is ready to send emails');
  }
});

// Temporary storage for reset codes
const resetCodes = new Map();

// Generate random 6-digit code
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send password reset code
router.post('/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if optician exists
    const optician = await Optician.findOne({ email });
    if (!optician) {
      return res.status(404).json({ message: 'Optician not found' });
    }

    // Generate and store reset code (valid for 15 minutes)
    const code = generateResetCode();
    resetCodes.set(email, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes expiration
    });

    // Send email with reset code
    const mailOptions = {
      from: 'yosrbencheikh28@gmail.com',
      to: email,
      subject: 'Code de réinitialisation de mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #1E5F74;">Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé une réinitialisation de mot de passe. Voici votre code de vérification :</p>
          <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 15px 0; color: #1E5F74;">
            <strong>${code}</strong>
          </div>
          <p>Ce code expirera dans 15 minutes.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
          <p style="margin-top: 30px; color: #666;">L'équipe OptiVision Pro</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Reset code sent successfully' });

  } catch (error) {
    console.error('Error sending reset code:', error);
    res.status(500).json({ message: 'Error sending reset code', error: error.message });
  }
});

// Verify reset code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate inputs
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    // Check if code exists for this email
    const storedCode = resetCodes.get(email);
    if (!storedCode) {
      return res.status(400).json({ message: 'No reset code found for this email' });
    }

    // Check if code is expired
    if (Date.now() > storedCode.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ message: 'Reset code has expired' });
    }

    // Verify code matches
    if (storedCode.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    res.status(200).json({ valid: true, message: 'Code verified successfully' });

  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({ message: 'Error verifying reset code', error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Validate inputs
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required' });
    }

    // Check if code exists for this email
    const storedCode = resetCodes.get(email);
    if (!storedCode) {
      return res.status(400).json({ message: 'No reset code found for this email' });
    }

    // Check if code is expired
    if (Date.now() > storedCode.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ message: 'Reset code has expired' });
    }

    // Verify code matches
    if (storedCode.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update optician's password
    const optician = await Optician.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!optician) {
      return res.status(404).json({ message: 'Optician not found' });
    }

    // Remove used reset code
    resetCodes.delete(email);

    res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

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
    const { password, ...rest } = req.body; // Récupérer le mot de passe en clair

    // 1. Hacher le mot de passe pour la base de données
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Créer l'opticien avec le mot de passe haché
    const optician = new Optician({
      ...rest,
      password: hashedPassword, 
    });

    const newOptician = await optician.save();

    // 3. Envoyer l'email AVEC LE MOT DE PASSE EN CLAIR
    try {
      await sendWelcomeEmail(newOptician, password); // <-- Ajouter le password original ici
      console.log(`Email de bienvenue envoyé à ${newOptician.email}`);
    } catch (emailError) {
      console.error(`Échec de l'envoi de l'email à ${newOptician.email}:`, emailError);
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

router.post('/loginOpticien', async (req, res) => {
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

    // Vérification du mot de passe avec bcrypt
    const isMatch = await bcrypt.compare(password, optician.password);

    if (!isMatch) {
      console.log(`Mot de passe incorrect pour l'opticien ${optician.email}`);
      return res.status(401).json({ message: 'Incorrect password' }); // Message clair pour le client
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