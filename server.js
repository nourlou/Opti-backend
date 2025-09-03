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
const uploadModelsRouter = require('./routes/uploadModels');

const opticianRoutes = require('./routes/opticianRoutes');

const orderRoutes = require('./routes/orderRoutes');
app.use(cors());
app.use(express.json());
//upload image
const path=require("path");
app.use("/images", express.static(path.join(__dirname, "images")));

app.use('/api/cart',require("./routes/cart_item"));

app.use('/api', userRoutes);
// Dans votre fichier app.js ou index.js
// Dans votre serveur Node.js
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow both specific origins and any localhost origin
  if (origin && (
    origin === 'http://192.168.1.19:3000' || 
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://localhost:')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback to allow all origins if needed
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  // Allow all common headers
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Allow these HTTP methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Important for WebGL/3D content
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});
// Servir les fichiers statiques du dossier models
app.use('/models', express.static(path.join(__dirname, '3DModels'), {
  setHeaders: (res, filePath, stat) => {
    // Set appropriate content types
    if (filePath.endsWith('.gltf')) {
      res.set('Content-Type', 'model/gltf+json');
    } else if (filePath.endsWith('.glb')) {
      res.set('Content-Type', 'model/gltf-binary');
    }
    
    // Get the origin from the request
    const origin = res.req.headers.origin;
    
    // Match the same CORS logic as above
    if (origin && (
      origin === '*' || 
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://localhost:')
    )) {
      res.set('Access-Control-Allow-Origin', origin);
    } else {
      res.set('Access-Control-Allow-Origin', '*');
    }
    
    // Add caching headers for better performance
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

app.use('/api', opticianRoutes);

app.use('/upload-model', uploadModelsRouter);

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
app.use("/api/products/upload", uploadProducts);
app.use("/ProductImages", express.static(imagesDir));
app.use("/upload", uploadProducts);

app.use("/api/products", productRoutes);



// Use the forgot password routes
app.use('/api', forgotPasswordRoutes);

// Logging middleware



// Upload route
app.use("/api/upload", require("./routes/upload"));
app.use("/opticiens", require("./routes/boutiques"));

app.use("/", require("./routes/login"));
app.use("/", require("./routes/resetPassword"));
app.use("/", require("./routes/updateUser"));

app.use('/api/wishlist', require('./routes/wishlist'));

//
//google route
app.use('/auth', require('./routes/googleAuth'));
app.use('/auth', require('./routes/facebookAuth'));
app.use('/api', require('./routes/reviewRoutes'));
app.use('/api', require('./routes/storeReview'));

//recommendation
app.use('/api', require('./routes/recommendation'));


//
dotenv.config(); // Load environment variables
const storeWishlistRoutes = require('./routes/storeWishlist');

// Add this line with your other app.use statements
app.use('/api', storeWishlistRoutes);
// Import the User model
const User = require('./models/User');

dotenv.config(); // Load environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_very_secure_secret_key';


const mongoURI = 'mongodb+srv://OptiApp:OptiApp2357@cluster0.j5jbz.mongodb.net/Opti_app?retryWrites=true&w=majority';
// MongoDB connection
// MongoDB connection
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    // Add more database logging if needed
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
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
  origin: 'http://192.168.1.19:3000',  // Allow requests from this origin (adjust if needed)
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

const PORT = 3000;
// Start the server
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://localhost:3000');
});
