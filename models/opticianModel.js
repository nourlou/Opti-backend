const mongoose = require('mongoose');

const opticianSchema = new mongoose.Schema({
  id: { type: String }, 
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  date: { type: String, required: true }, 
  genre: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  region: { type: String, required: true },
  imageUrl: { type: String, default: '' }, 
  status: { type: String, default: 'Inactive' }, 
});

const Optician = mongoose.model('Optician', opticianSchema);

module.exports = Optician;