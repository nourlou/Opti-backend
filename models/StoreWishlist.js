const mongoose = require('mongoose');

const storeWishlistSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to ensure a user can't favorite the same store twice
storeWishlistSchema.index({ customerId: 1, boutiqueId: 1 }, { unique: true });

module.exports = mongoose.model('StoreWishlist', storeWishlistSchema);