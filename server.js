const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;



dotenv.config(); // Load environment variables
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Remplacez avec votre ID client Google
process.env.JWT_SECRET = 'your_very_secure_secret_key';
const cors = require('cors');
const nodemailer = require('nodemailer');

const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;



 // Load environment variables
process.env.JWT_SECRET = 'your_very_secure_secret_key';

const app = express();
app.use(cors());
app.use(express.json());


// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Opti_app', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware to parse JSON request body
app.use(express.json());

// Initialize passport
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

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
const GOOGLE_CLIENT_ID = '95644263598-f0kl6h2bh00hcng322rn4a57dj5ubgje.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET= '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'
// Google Strategy Setup
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,  //clientSecret: process.env.GOOGLE_CLIENT_SECRET,
   
  clientSecret:GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  // Check if user already exists in DB
  User.findOne({ email: profile.emails[0].value }).then(user => {
    if (user) {
      done(null, user);
    } else {
      const newUser = new User({
        nom: profile.name.givenName,
        prenom: profile.name.familyName,
        email: profile.emails[0].value,
        date: new Date().toISOString(),
        password: '',
        phone: '',  // You can set this later if required
        region: '',
        gender: '',
      });

      newUser.save().then(() => done(null, newUser));
    }
  });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.get('/', (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/profile');
});

app.get('/profile', (req, res) => {
  res.send(`Welcome ${req.user.displayName}`);
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Registration Route
// Registration Route
app.post('/api/users', async (req, res) => {
  try {
    const { nom, prenom, email, date, password, phone, region, gender } = req.body;
    
    // Validate all required fields
    if (!nom || !prenom || !email || !date || !password || !phone || !region || !gender) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = new User({ nom, prenom, email, date, password: hashedPassword, phone, region, gender });
    await newUser.save();

    // Generate a JWT token for the new user
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return userId and token in the response
    return res.status(201).json({
      message: 'User registered successfully',
      userId: newUser._id,
      token: token
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

    // Verify user in DB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create a JWT token after validation
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });

  } catch (err) {
    return res.status(500).json({ message: 'Error logging in user' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


// Temporary storage for reset codes
const resetCodes = new Map(); // { email: { code, expiresAt } }

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your SMTP service
  auth: {
    user: 'yosrbencheikh28@gmail.com',
    pass: 'xqzc yhwk kdvi pmdy',
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.log('Error in transporter configuration:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

// Forgot Password Route - Send Code
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  // Generate a 6-digit reset code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes

  // Store reset code temporarily
  resetCodes.set(email, { code: resetCode, expiresAt });

  // Debug log to confirm reset code storage
  console.log(`Storing reset code for ${email}: ${resetCode}, expires at: ${new Date(expiresAt)}`);

  // Send email with the reset code
  const mailOptions = {
    from:'yosrbencheikh28@gmail.com',
    to: email,
    subject: 'Password Reset Code',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .email-container {
            width: 100%;
            background-color: #ffffff;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
          }
          .email-header {
            background-color: #007BFF;
            color: #ffffff;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
          }
          .email-header h1 {
            margin: 0;
          }
          .email-body {
            padding: 20px;
            font-size: 16px;
            color: #333;
          }
          .email-footer {
            background-color: #f4f4f4;
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #777;
          }
          .code {
            display: inline-block;
            padding: 12px 20px;
            background-color:rgb(51, 183, 183);
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="email-body">
            <p>Dear ${email},</p>
            <p>We received a request to reset your password. To proceed, please use the verification code below:</p>
            <div class="code">
              ${resetCode}
            </div>
            <p>Please enter this code on the password reset page to continue.</p>
            <p>If you didn't request a password reset, please ignore this email or let us know.</p>
          </div>
          <div class="email-footer">
            <p>Best regards,</p>
            <p>Your Company Name</p>
            <p>www.yourwebsite.com</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  


  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send({
        message: 'Error sending email',
        error: error.response ? error.response : error.message,
      });
    }
    console.log('Email sent: ' + info.response);
    res.status(200).send({ message: 'Reset code sent to email' });
  });
});

// Verify Code Route
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;

  // Debug log to track the code verification process
  console.log(`Verifying code for email: ${email}`);

  const storedData = resetCodes.get(email);

  // Check if the stored data exists and the code matches
  if (!storedData) {
    console.log(`No stored reset data for email: ${email}`);
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  if (storedData.code !== code) {
    console.log(`Incorrect code for ${email}. Expected: ${storedData.code}, received: ${code}`);
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  // Check if the code has expired
  if (Date.now() > storedData.expiresAt) {
    resetCodes.delete(email); // Remove expired code
    console.log(`Code for ${email} has expired.`);
    return res.status(400).send({ message: 'Code has expired' });
  }

  // Debug log if the code is valid
  console.log(`Code verified for email: ${email}`);
  res.status(200).send({ message: 'Code verified' });
});

// Reset Password Route
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  const storedData = resetCodes.get(email);

  // Debug log to track the reset password process
  console.log(`Resetting password for email: ${email}`);

  if (!storedData || storedData.code !== code) {
    console.log(`Invalid or expired code for ${email}`);
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  // Check if the code has expired
  if (Date.now() > storedData.expiresAt) {
    resetCodes.delete(email); // Remove expired code
    console.log(`Code for ${email} has expired during password reset.`);
    return res.status(400).send({ message: 'Code has expired' });
  }
  console.log('Reset Password Request:');
  console.log('Email: $email');
  console.log('Code: $verificationCode');
  console.log('Response: ${response.body}');
  // Hash new password and update user
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ email }, { password: hashedPassword });

  // Remove reset code after successful reset
  resetCodes.delete(email);

  // Debug log when the password is successfully reset
  console.log(`Password for ${email} has been reset successfully.`);
  res.status(200).send({ message: 'Password has been reset successfully' });
});

// Other existing routes (unchanged)
app.get('/api/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      return res.status(200).send(user);
    } else {
      return res.status(404).send({ message: 'User not found' });
    }
  } catch (err) {
    return res.status(500).send({ message: 'Error retrieving user' });
  }
});

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
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error registering user' });
  }
});


// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate the input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if the user exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return the response with the token
    return res.status(200).json({ message: 'Login successful', token });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Error logging in user', error: err.message });
  }
});



app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { nom, email, dateNaissance, region, genre } = req.body;
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // If the password is provided, hash it, otherwise, keep the old one
    let updatedPassword = user.password;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updatedPassword = await bcrypt.hash(req.body.password, salt);
    }

    // Update user data
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        nom,
        email,
        dateNaissance,
        region,
        genre,
        password: updatedPassword, // only update password if provided
      },
      { new: true }
    );

    // Return success message
    return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });

  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ message: 'Error updating user', error: err.message });
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});
const router = express.Router();
require('dotenv').config();

passport.use(
  new FacebookStrategy(
    {
      clientID: '1304521740805476',  // Replace with your own Facebook App ID
      clientSecret: '0f14d7edea3140df0913c5c7ce734710',  // Replace with your own Facebook App Secret
      callbackURL: 'http://localhost:3000/auth/facebook/callback',
    },
    async (accessToken, refreshToken, profile, cb) => {
      const user = await User.findOne({
        accountId: profile.id,
        provider: 'facebook',
      });

      if (!user) {
        console.log('Adding new Facebook user to DB..');
        const newUser = new User({
          accountId: profile.id,
          name: profile.displayName,
          provider: profile.provider,
        });
        await newUser.save();
        return cb(null, profile);
      } else {
        console.log('Facebook user already exists in DB..');
        return cb(null, profile);
      }
    }
  )
);

// Route to handle Facebook login from Flutter app
router.post('/api/facebook-login', async (req, res) => {
  try {
    const { accessToken } = req.body;

    // Step 1: Verify the token with Facebook
    const response = await axios.get(
      `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`
    );

    if (response.data && response.data.id) {
      // Step 2: Authenticate with Passport
      passport.authenticate('facebook', (err, user) => {
        if (err) {
          return res.status(500).send('Error during authentication');
        }

        if (user) {
          // Generate a JWT or session token (example below)
          const token = 'generated-token-here';  // Replace with your JWT generation logic
          return res.json({ token, user });
        } else {
          return res.status(401).send('Facebook user not authenticated');
        }
      })(req, res); // Trigger passport's authentication
    } else {
      return res.status(400).send('Invalid Facebook access token');
    }
  } catch (error) {
    console.error('Error during Facebook login:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Add route to handle Facebook authentication via passport
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// Handle Facebook callback
router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/auth/facebook/error' }),
  (req, res) => {
    // Successful login
    res.redirect('/auth/facebook/success');
  }
);

// Handle success and failure routes
router.get('/auth/facebook/success', (req, res) => {
  res.send('Facebook login successful');
});

router.get('/auth/facebook/error', (req, res) => {
  res.send('Error logging in via Facebook');
});

// Add the router to your app
app.use(router);

// Your server setup (e.g., listening on port 3000)

const PORT = process.env.PORT || 3000;

// Start Server

