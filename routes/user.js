const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../services/emailService'); // Import the email service
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key'; // Utilisez une variable d'environnement en production

// Dans userRoutes.js
router.post('/users/by-ids', async (req, res) => {
  try {
    const { userIds } = req.body;
    const users = await User.find({ _id: { $in: userIds } });
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users by IDs:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users by IDs', 
      error: err.message 
    });
  }
});
// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Get user by email
router.get('/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return ares.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});



// Route pour ajouter un utilisateur
router.post('/users', async (req, res) => {
  try {
    const { nom, prenom, email, date, password, phone, region, genre } = req.body;

    // Validation des champs obligatoires
    if (!nom || !prenom || !email || !date || !password || !phone || !region || !genre) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur
    const newUser = new User({
      nom,
      prenom,
      email,
      date,
      password: hashedPassword,
      phone,
      region,
      genre,
      status: 'Active',
      imageUrl: '',
      refreshToken: '',
    });

    // Sauvegarder l'utilisateur dans la base de données
    await newUser.save();

    // Envoyer un email de bienvenue avec le mot de passe en clair
    try {
      await sendWelcomeEmail(newUser, password); // Envoyer le mot de passe en clair
      console.log(`Email de bienvenue envoyé à ${newUser.email}`);
    } catch (emailError) {
      console.error(`Échec de l'envoi de l'email à ${newUser.email}:`, emailError);
    }

    // Générer un token JWT pour l'utilisateur
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Réponse avec les détails de l'utilisateur et le token
    res.status(201).json({
      message: 'Utilisateur enregistré avec succès',
      userId: newUser._id,
      token,
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'utilisateur', error: error.message });
  }
});

module.exports = router;

// Update user
router.put('/users/:email', async (req, res) => {
  try {
    const { nom, prenom, date, phone, region, genre, imageUrl, status } = req.body;
    
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (date) user.date = date;
    if (phone) user.phone = phone;
    if (region) user.region = region;
    if (genre) user.genre = genre;
    if (imageUrl) user.imageUrl = imageUrl;
    if (status) user.status = status;
    
    await user.save();
    
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

// Delete user
router.delete('/users/:email', async (req, res) => {
  try {
    const result = await User.findOneAndDelete({ email: req.params.email });
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});
// Get user by ID
router.get('/users/id/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ message: 'Error fetching user by ID', error: err.message });
  }
});

module.exports = router;