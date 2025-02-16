const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');// Verify the correct path
const client = new OAuth2Client('95644263598-p1ko0g4ds7ko6v6obqkdc38j76ndjmt2.apps.googleusercontent.com');

router.post('/google/callback', async (req, res) => {
  try {
    console.log('Received request body:', req.body); // Debug log

    const { idToken } = req.body;
    
    if (!idToken) {
      console.log('No idToken provided'); // Debug log
      return res.status(400).json({ error: 'No ID token provided' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: '95644263598-p1ko0g4ds7ko6v6obqkdc38j76ndjmt2.apps.googleusercontent.com'
    });
    
    const payload = ticket.getPayload();
    console.log('Token payload:', payload); // Debug log
    
    const email = payload.email;
    
    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        password: 'GOOGLE_AUTH_' + Math.random().toString(36).slice(-8),
        nom: payload.family_name,
        prenom: payload.given_name,
        genre: 'Femme',
        date: '2003-10-10',
        region: 'Nabeul',
        phone: 22222222,
        imageUrl:payload.picture
      });
      await user.save();
      console.log('Created new user:', user); // Debug log
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );
    
    res.json({ token, user });
  } catch (error) {
    console.error('Detailed error:', error); // Debug log
    res.status(401).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
});


module.exports = router;