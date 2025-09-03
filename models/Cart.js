// models/Cart.js
const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CartItem',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Cart', CartSchema);
