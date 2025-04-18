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
    type: mongoose.Schema.Types.Mixed, // Accepte à la fois String et ObjectId
    ref: 'Optician',
    required: false
  },
  averageRating: { 
    type: Number, 
    default: 0 
  },
  totalReviews: { 
    type: Number, 
    default: 0 
  }

});

module.exports = mongoose.model('Boutique', opticienSchema, 'Boutique');