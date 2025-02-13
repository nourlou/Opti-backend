const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const nodemailer = require('nodemailer');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');

// Import the User model
const User = require('./models/User');

dotenv.config(); // Load environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_very_secure_secret_key';

const app = express();

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(session({ 
  secret: process.env.SESSION_SECRET || 'yourSecretKey', 
  resave: false, 
  saveUninitialized: true 
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Opti_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  bufferCommands: false,  // Disable buffering of commands
  connectTimeoutMS: 30000  // Increase the timeout period to 30 seconds
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Google Authentication Setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '95644263598-p1ko0g4ds7ko6v6obqkdc38j76ndjmt2.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://abc123.ngrok.io/auth/google/callback'

  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Vérifiez si l'utilisateur existe déjà dans votre base de données
      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        // Créez un nouvel utilisateur si nécessaire
        user = new User({
          nom: profile.name.givenName,
          prenom: profile.name.familyName,
          email: profile.emails[0].value,
          password: 'GOOGLE_AUTH', // Mot de passe factice pour les utilisateurs Google
        });
        await user.save();
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// verify-token
app.get('/api/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ valid: false, message: 'User not found' });
    }

    return res.status(200).json({ valid: true, userId: user._id });
  } catch (error) {
    return res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// Google Authentication Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('Utilisateur authentifié:', req.user);
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.redirect(`${process.env.FRONTEND_URL || 'http://192.168.1.189:3000'}?token=${token}`);
  }
);

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    pass: process.env.EMAIL_PASS || 'xqzc yhwk kdvi pmdy',
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log('Error in transporter configuration:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

// Temporary storage for reset codes
const resetCodes = new Map(); // { email: { code, expiresAt } }

// Registration Route
app.post('/api/users', async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, region, gender } = req.body;

    if (!nom || !prenom || !email || !password || !phone || !region || !gender) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      nom, prenom, email, password: hashedPassword,
      phone, region, gender
    });

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
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Error logging in user', error: err.message });
  }
});

// Forgot Password Route
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  resetCodes.set(email, { code: resetCode, expiresAt });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    to: email,
    subject: 'Password Reset Code',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Your email styles here */
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="email-body">
            <p>Dear ${email},</p>
            <p>Your verification code is: ${resetCode}</p>
            <p>This code will expire in 5 minutes.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send({ message: 'Error sending email', error });
    }
    res.status(200).send({ message: 'Reset code sent to email' });
  });
});

// Verify Code Route
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;
  const storedData = resetCodes.get(email);

  if (!storedData || storedData.code !== code || Date.now() > storedData.expiresAt) {
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  res.status(200).send({ message: 'Code verified' });
});

// Reset Password Route
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  const storedData = resetCodes.get(email);

  if (!storedData || storedData.code !== code || Date.now() > storedData.expiresAt) {
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    resetCodes.delete(email);
    res.status(200).send({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error resetting password' });
  }
});

// Facebook Authentication Setup
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID || '1304521740805476',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '0f14d7edea3140df0913c5c7ce734710',
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://192.168.1.189:3000/auth/facebook/callback',
  },
  async (accessToken, refreshToken, profile, cb) => {
    try {
      let user = await User.findOne({
        email: profile.emails[0].value
      });

      if (!user) {
        user = new User({
          nom: profile.name.givenName,
          prenom: profile.name.familyName,
          email: profile.emails[0].value,
          date: new Date().toISOString(),
          password: 'FACEBOOK_AUTH',
          phone: 'N/A',
          region: 'N/A',
          gender: 'N/A',
        });
        await user.save();
      }
      return cb(null, user);
    } catch (error) {
      return cb(error, null);
    }
  }
));

// Facebook Authentication Routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.redirect(`${process.env.FRONTEND_URL || 'http://192.168.1.189:3000'}?token=${token}`);
  }
);

// User Management Routes
app.get('/api/users/:email', async (req, res) => {
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

app.put('/api/users/:id', async (req, res) => {
  try {
    const { nom, email, dateNaissance, region, genre } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        nom,
        email,
        dateNaissance,
        region,
        genre,
        ...(req.body.password && {
          password: await bcrypt.hash(req.body.password, 10)
        })
      },
      { new: true }
    );
    return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Home route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Welcome ${req.user.name.givenName} ${req.user.name.familyName}`);
  } else {
    res.send('<a href="/auth/google">Login with Google</a>');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 Google Login URL: http://localhost:${PORT}/auth/google`);
});