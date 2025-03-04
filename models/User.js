const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String},
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  region: { type: String, required: true },
  genre: { type: String, required: true },
  imageUrl: { type: String},
  refreshToken: { type: String } // Add this field to store the refresh token
});

module.exports = mongoose.model('User', UserSchema);