const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/facebook/callback', async (req, res) => {
  const { token, email } = req.body;

  if (!token || !email) {
    return res.status(400).json({ error: 'Token and email are required' });
  }

  try {
    // Verify the Facebook token with Facebook's API
    const facebookResponse = await axios.get(
      `https://graph.facebook.com/v12.0/me?access_token=${token}&fields=id,name,email`
    );

    const { id, name, email: facebookEmail } = facebookResponse.data;

    // Check if the email matches
    if (facebookEmail !== email) {
      return res.status(400).json({ error: 'Email mismatch' });
    }

    // Create or find the user in your database
    let user = await User.findOne({ facebookId: id });
    if (!user) {
      user = new User({
        facebookId: id,
        name,
        email,
        genre: 'Not specified', // Default value
        region: 'Not specified', // Default value
        phone: 'Not specified', // Default value
        password: 'facebook_user', // Default value
        date: new Date(), // Default value
        prenom: name.split(' ')[0], // Extract first name from full name
        nom: name.split(' ')[1] || 'Not specified', // Extract last name from full name
      });
      await user.save();
    }

    // Generate a JWT token
    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email }, // Payload
      'your_secret_key', // Replace with your secret key
      { expiresIn: '1h' } // Token expiration time
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Facebook login successful',
      user: { id, name, email },
      token: jwtToken, // Send the generated JWT token
    });
  } catch (error) {
    console.error('Facebook login error:', error);
    res.status(500).json({ error: 'Facebook login failed' });
  }
});

module.exports = router;
