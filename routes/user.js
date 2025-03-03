const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});

// Register new user
router.post('/users', async (req, res) => {
  try {
    const { nom, prenom, email, date, password, phone, region, genre } = req.body;
    
    // Validate all required fields
    if (!nom || !prenom || !email || !date || !password || !phone || !region || !genre) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the new user
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
      refreshToken: ''
    });
    
    await newUser.save();
    
    // Generate a JWT token for the new user
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    return res.status(201).json({
      message: 'User registered successfully',
      userId: newUser._id,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

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

module.exports = router;