const mongoose = require('mongoose');

const opticienSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
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
  }
});

module.exports = mongoose.model('Opticien', opticienSchema);