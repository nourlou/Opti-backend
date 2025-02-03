 
// Importation des dépendances nécessaires
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Initialisation de l'application Express
const app = express();

// Middleware pour permettre les requêtes CORS et parser le corps des requêtes en JSON
app.use(express.json());
app.use(cors());

// Connexion à la base de données MongoDB
mongoose.connect('mongodb://localhost:27017/Opti_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.error('Échec de la connexion à MongoDB', err));

// Création d'un modèle de données pour les utilisateurs (par exemple)
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  password: String,
}));

// Route POST pour créer un utilisateur
app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body;
  const user = new User({ name, email, password });
  await user.save();
  res.status(201).send(user);
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
const port = 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
