 
// Importation des dépendances nécessaires
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialisation de l'application Express
const app = express();

// Middleware pour permettre les requêtes CORS et parser le corps des requêtes en JSON
app.use(express.json());
app.use(cors());

// Connexion à la base de données MongoDB
mongoose.connect('mongodb://localhost:27017/mon_app', {
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

// Démarrage du serveur
const port = 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
