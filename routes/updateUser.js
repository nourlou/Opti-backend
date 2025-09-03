

const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});
// Define the EMAIL_REGEX for email validation
// Define the EMAIL_REGEX for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.put('/api/update/:email', express.json(), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const userEmail = req.params.email;
    
    if (!EMAIL_REGEX.test(userEmail)) {
      return res.status(400).json({
        message: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: userEmail });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create update object with only provided fields
    const updateFields = {};
    const { nom, prenom, email, date, phone, region, genre, password } = req.body;

    if (nom) updateFields.nom = nom;
    if (prenom) updateFields.prenom = prenom;
    if (email && email !== userEmail) {
      // Check if new email is already taken
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateFields.email = email;
    }
    if (date) updateFields.date = date;
    if (phone) updateFields.phone = phone;
    if (region) updateFields.region = region;
    if (genre) updateFields.genre = genre;
   

    // Update user with new fields
    const updatedUser = await User.findOneAndUpdate(
      { email: userEmail },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Update failed' });
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;