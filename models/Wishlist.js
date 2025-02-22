const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

// Add compound index to prevent duplicate wishlist entries
wishlistSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);