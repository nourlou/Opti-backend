const mongoose = require('mongoose');

const opticienSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  adresse: {
    type: String,
    required: true
  },
  ville: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  opening_hours: {
    type: String,
    required: true
  },
  opticien_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Optician', 
    required: false
  },

});

module.exports = mongoose.model('Opticien', opticienSchema, 'Boutique');