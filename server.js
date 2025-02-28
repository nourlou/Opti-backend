const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const session = require('express-session');
const fs = require('fs');
const multer = require('multer');
const userRoutes = require('./routes/user');
const app = express();
const cors = require('cors');
const nodemailer = require('nodemailer');

const orderRoutes = require('./routes/orderRoutes');
app.use(cors());
app.use(express.json());
//upload image
const path=require("path");
app.use("/images", express.static(path.join(__dirname, "images")));

app.use('/api/cart',require("./routes/cart_item"));

app.use('/api', userRoutes);

app.use('/orders', orderRoutes);
// Configuration du dossier des images
const imagesDir = path.join(__dirname, "ProductImages");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.chmodSync(imagesDir, 0o777);
}
const upload = multer({ dest: 'ProductImages/' }); // Ajoutez cette ligne
const uploadProducts = require("./routes/uploadProducts");
const productRoutes = require('./routes/products');
const forgotPasswordRoutes = require('./routes/forgot-password');
app.use("/ProductImages", express.static(imagesDir));
app.use("/upload", uploadProducts);

app.use("/ProductImages", express.static(imagesDir));

app.use("/api/products", productRoutes);

app.use("/api/product", require("./routes/uploadProducts"));

app.use("/", uploadProducts);
// Use the forgot password routes
app.use('/api', forgotPasswordRoutes);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Upload route
app.use("/api/upload", require("./routes/upload"));
app.use("/opticiens", require("./routes/opticiens"));

app.use('/api/wishlist', require('./routes/wishlist'));

//
//google route
app.use('/auth', require('./routes/googleAuth'));
app.use('/auth', require('./routes/facebookAuth'));
//
dotenv.config(); // Load environment variables

// Import the User model
const User = require('./models/User');

dotenv.config(); // Load environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_very_secure_secret_key';


app.post('/api/refresh-token', async (req, res) => {
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



// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Opti_app')
  .then(async () => {
    console.log('✅ MongoDB connected successfully');
    
    // Log database info
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\nDatabase Collections:', collections.map(c => c.name));
    
    // Check users collection
    const usersCount = await db.collection('users').countDocuments();
    console.log('Total users in database:', usersCount);
    
    // Sample first user
    const sampleUser = await db.collection('users').findOne({});
    console.log('Sample user structure:', 
      sampleUser ? Object.keys(sampleUser) : 'No users found'
    );
  });
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to:', mongoose.connection.host);
  console.log('Database:', mongoose.connection.name);
  console.log('Collection:', User.collection.name);
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

// CORS Configuration
app.use(cors({
  origin: 'http://localhost:3000',  // Allow requests from this origin (adjust if needed)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],}
));


app.use(session({
  secret: 'cfghjklmghjk', // Replace with a secure secret key
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
// Middleware setup
app.use(cors({
  resave: false, 
  saveUninitialized: true 
}));




// verify-token
app.get('/api/verify-token', async (req, res) => {
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


// Email configuration for general use (not related to password reset)
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



// Registration Route
app.post('/api/users', async (req, res) => {
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
app.post('/api/login', async (req, res) => {
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

const PORT = 3000;
// Start the server
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});


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

app.post('/api/users', async (req, res) => {
  try {
    const { nom, prenom, email, date, password, phone, region, genre } = req.body;
    if (!nom || !prenom || !email || !date || !password || !phone || !region || !genre) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ nom, prenom, email, date, password: hashedPassword, phone, region, genre });

    await newUser.save();
    return res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Error registering user' });
  }
});





app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});
// Define the EMAIL_REGEX for email validation
// Define the EMAIL_REGEX for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.put('/api/update/:email', express.json(), async (req, res) => {
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



// In your Node.js user route
app.get('/api/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('\n=== User Lookup Debug ===');
    console.log('1. Requested userId:', userId);

    // Verify MongoDB connection
    console.log('2. MongoDB connection state:', mongoose.connection.readyState);
    
    // Try direct MongoDB query first
    const directUser = await mongoose.connection.db.collection('users')
      .findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    console.log('3. Direct MongoDB query result:', directUser ? {
      _id: directUser._id.toString(),
      email: directUser.email
    } : 'Not found');

    // Try Mongoose query with debugging
    console.log('4. Attempting Mongoose findById...');
    const user = await User.findById(userId).lean();
    
    console.log('5. Mongoose query result:', user ? {
      _id: user._id.toString(),
      email: user.email
    } : 'Not found');

    if (!user && directUser) {
      console.log('6. Discrepancy detected: Document exists in MongoDB but not found via Mongoose');
      console.log('Direct user fields:', Object.keys(directUser));
      
      // Try creating a new Mongoose document from the direct result
      const userDoc = new User(directUser);
      console.log('7. Validation result:', userDoc.validateSync() || 'Valid');
      
      return res.json(directUser);
    } else if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in /api/users/:userId:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
});
// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});