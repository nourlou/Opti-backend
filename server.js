const express = require('express');
const mongoose = require('mongoose');
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
const { OAuth2Client } = require('google-auth-library');


dotenv.config(); // Load environment variables
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Remplacez avec votre ID client Google
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
<<<<<<< HEAD
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2
=======
app.use(cors());
app.use(express.json());
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76

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
// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/Opti_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

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
    from: 'yosrbencheikh28@gmail.com',
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
<<<<<<< HEAD
<<<<<<< HEAD
    return res.status(500).send({ message: 'Error creating user', error: err.message });
=======
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error registering user' });
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2
=======
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error registering user' });
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
<<<<<<< HEAD
<<<<<<< HEAD
    const { nom, email, password } = req.body;
    const { id } = req.params;  // Get user ID from URL parameter
=======
=======
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
<<<<<<< HEAD
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2
=======
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76

    // Vérifier si l'utilisateur existe dans la base de données
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Comparer le mot de passe envoyé avec celui stocké dans la base de données
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Créer un jeton JWT après la validation
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Retourner la réponse avec le jeton JWT
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
    const { nom, email, password } = req.body;
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

<<<<<<< HEAD
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
=======
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }
    let updatedPassword = password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedPassword = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { nom, email, password: updatedPassword },
      { new: true }
    );
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76

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
<<<<<<< HEAD
// Server listening on port 3000

=======
=======
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
<<<<<<< HEAD
>>>>>>> 05887eac395d58b74c9820ff71bae7588f4da0a2
=======
>>>>>>> fa00f3496c43b432dde7bbf907f37a2e0cdb5f76
