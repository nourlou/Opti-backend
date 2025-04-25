const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// Récupérer tous les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Récupérer un utilisateur par email
router.get('/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});

// Récupérer plusieurs utilisateurs par IDs
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

// Créer un nouvel utilisateur
router.post('/users', async (req, res) => {
  try {
    const { nom, prenom, email, date, password, phone, region, genre } = req.body;
    if (!nom || !prenom || !email || !date || !password || !phone || !region || !genre) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      nom, prenom, email, date,
      password: hashedPassword,
      phone, region, genre,
      status: 'Active',
      imageUrl: '',
      refreshToken: '',
    });

    await newUser.save();

    // Envoi de l'email de bienvenue
    try {
      await sendWelcomeEmail(newUser, password);
      console.log(`Email de bienvenue envoyé à ${newUser.email}`);
    } catch (emailError) {
      console.error(`Échec envoi email à ${newUser.email}:`, emailError);
    }

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Utilisateur enregistré avec succès',
      userId: newUser._id,
      token,
    });
  } catch (error) {
    console.error('Erreur enregistrement utilisateur:', error);
    res.status(500).json({ message: 'Erreur enregistrement utilisateur', error: error.message });
  }
});

// Mettre à jour un utilisateur
router.put('/users/:email', async (req, res) => {
  try {
    const { nom, prenom, date, phone, region, genre, imageUrl, status } = req.body;
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mise à jour conditionnelle des champs
    if (nom)      user.nom = nom;
    if (prenom)   user.prenom = prenom;
    if (date)     user.date = date;
    if (phone)    user.phone = phone;
    if (region)   user.region = region;
    if (genre)    user.genre = genre;
    if (imageUrl) user.imageUrl = imageUrl;
    if (status)   user.status = status;

    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

// Supprimer un utilisateur
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

// Récupérer un utilisateur par ID
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
