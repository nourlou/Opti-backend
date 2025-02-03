const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const bcrypt = require('bcrypt');

// Initialisation de l'application Express
const bcrypt = require('bcryptjs'); // For hashing passwords
const app = express();

// User model with additional fields
const User = mongoose.model('User', new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  date: { type: String, required: true }, // Date format: yyyy-MM-dd
  password: { type: String, required: true },
}));

// Connexion à la base de données MongoDB
app.use(express.json()); // Middleware to parse JSON request body

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Opti_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// Vérifier si l'utilisateur existe déjà avec l'email
app.get('/api/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      return res.status(200).send(user); // Email exists
    } else {
      return res.status(404).send({ message: 'User not found' }); // Email doesn't exist
    }
  } catch (err) {
    return res.status(500).send({ message: 'Error retrieving user' });
  }
});

// Créer un nouvel utilisateur
app.post('/api/users', async (req, res) => {
  const { nom, prenom, email, date, password } = req.body;

  try {
    // Check if the user already exists before creating
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'User with this email already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Proceed to create the user
    const newUser = new User({
      nom,
      prenom,
      email,
      date,
      password: hashedPassword, // Save the hashed password
    });
    
    await newUser.save(); // Save the user to the database

    return res.status(201).send(newUser); // Respond with the created user data
  } catch (err) {
    return res.status(500).send({ message: 'Error creating user' });
  }
});

// Route GET pour récupérer tous les utilisateurs
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { id } = req.params;  // Get user ID from URL parameter

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // If password is being updated, hash it
    let updatedPassword = password;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedPassword = await bcrypt.hash(password, salt);
    }

    // Update user details
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, password: updatedPassword },
      { new: true } // Return the updated user
    );

    res.status(200).send(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error updating user' });
  }
});

// Démarrage du serveur
const port = 3001;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
// Server listening on port 3000
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
