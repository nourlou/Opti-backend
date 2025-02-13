const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  region: { type: String, required: true },
  gender: { type: String, required: true },
});

module.exports = mongoose.model('User', userSchema);