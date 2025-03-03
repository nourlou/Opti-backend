const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();



router.post('/api/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find the user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check if the refresh token is still valid
    if (!user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Refresh token expired or invalid' });
    }

    // Generate a new access token
    const newToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Set access token expiry
    );

    // Return the new access token
    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// verify-token
router.get('/api/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dfghjkl");
    
    return res.status(200).json({ valid: true, userId: decoded.id });
  } catch (error) {
    return res.status(401).json({ valid: false, message: 'Invalid or expired token' });
  }
});



// Registration Route
router.post('/api/users', async (req, res) => {
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
    const newUser = new User({ nom, prenom, email, date, password: hashedPassword, phone, region, genre });
    await newUser.save();

    // Generate a JWT token for the new user
    await newUser.save();  // Sauvegarde l'utilisateur dans MongoDB
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



// Login Route
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "dfghjkl",
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || "dfcgvhbjnk,l",
      { expiresIn: '7d' }
    );
    

    // Save refresh token to user and persist changes
   // user.refreshTokens.push(refreshToken);
    await user.save(); // Persist the refresh token

    // Return both tokens to the client
    return res.status(200).json({ message: 'Login successful', token, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Error logging in user', error: err.message });
  }
});

router.get('/api/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      return res.status(200).send(user);
    }
    return res.status(404).send({ message: 'User not found' });
  } catch (err) {
    return res.status(500).send({ message: 'Error retrieving user' });
  }
});
// Get user by ID
router.get('/api/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate the userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user details (excluding sensitive information like password)
    const userDetails = {
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      date: user.date,
      phone: user.phone,
      region: user.region,
      genre: user.genre,
    };

    return res.status(200).json(userDetails);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    return res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});

module.exports = router;