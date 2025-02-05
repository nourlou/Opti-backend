const express = require('express');
const mongoose = require('mongoose');
<<<<<<< HEAD
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
app.use(cors());




// Initialisation de l'application Express
 // For hashing passwords

=======
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');


dotenv.config(); // Load environment variables
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Remplacez avec votre ID client Google
process.env.JWT_SECRET = 'your_very_secure_secret_key';
const app = express();
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Opti_app', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// CORS Configuration
app.use(cors({
  origin: '*', // 🔹 Autorise toutes les origines (peut être ajusté)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware to parse JSON request body
app.use(express.json());

// User model
const User = mongoose.model('User', new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  region: { type: String, required: true },
  gender: { type: String, required: true },
}));

// Registration Route
app.post('/api/users', async (req, res) => {
  try {
    const { nom, prenom, email, date, password, phone, region, gender } = req.body;
    if (!nom || !prenom || !email || !date || !password || !phone || !region || !gender) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ nom, prenom, email, date, password: hashedPassword, phone, region, gender });

    await newUser.save();
    return res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
<<<<<<< HEAD
    return res.status(500).send({ message: 'Error creating user', error: err.message });
=======
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error registering user' });
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
<<<<<<< HEAD
    const { nom, email, password } = req.body;
    const { id } = req.params;  // Get user ID from URL parameter
=======
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

<<<<<<< HEAD
    // Update user details
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { nom, email, password: updatedPassword },
      { new: true } // Return the updated user
    );
=======
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Login successful', token });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Error logging in user', error: err.message });
  }
});

// Google Login Route
app.post('/api/google-login', async (req, res) => {
  const { token } = req.body;  // Le token envoyé par le client Flutter

  try {
    // Vérifiez et validez le token Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Assurez-vous de configurer correctement votre GOOGLE_CLIENT_ID dans le .env
    });

    const payload = ticket.getPayload();  // Récupérez les informations de l'utilisateur à partir du token validé

    // Vérifiez si l'utilisateur existe déjà dans MongoDB
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      // Si l'utilisateur n'existe pas, créez-le dans MongoDB
      user = new User({
        nom: payload.given_name,  // Utilisez les informations fournies par Google
        prenom: payload.family_name,
        email: payload.email,
        date: new Date().toISOString(),
        password: 'N/A',  // Vous pouvez ne pas avoir de mot de passe ici, car l'utilisateur se connecte via Google
        phone: 'N/A',
        region: 'N/A',
        gender: 'N/A',
      });

      await user.save();
    }

    // Générez un JWT pour l'utilisateur après avoir validé son login avec Google
    const tokenJwt = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Google login successful',
      token: tokenJwt,
      user: {
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('Error during Google login:', error);
    return res.status(400).json({ message: 'Invalid Google token', error: error.message });
  }
});
<<<<<<< HEAD
// Server listening on port 3000

=======

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2
