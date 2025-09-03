const express = require('express');
const StoreWishlist = require('../models/StoreWishlist');
const Boutique = require('../models/Boutique');
const router = express.Router();

// Add a store to wishlist
router.post('/storewishlist', async (req, res) => {
  const { customerId, boutiqueId } = req.body;

  if (!customerId || !boutiqueId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if already in wishlist
    const existingWishlist = await StoreWishlist.findOne({ customerId, boutiqueId });
    
    if (existingWishlist) {
      // If already in wishlist, remove it (toggle behavior)
      await StoreWishlist.deleteOne({ _id: existingWishlist._id });
      return res.status(200).json({ 
        message: 'Store removed from wishlist',
        isFavorite: false
      });
    }
    
    // If not in wishlist, add it
    const newWishlistItem = new StoreWishlist({
      customerId,
      boutiqueId
    });
    
    const savedItem = await newWishlistItem.save();
    res.status(201).json({
      message: 'Store added to wishlist',
      wishlistItem: savedItem,
      isFavorite: true
    });
  } catch (error) {
    console.error('Wishlist operation error:', error);
    res.status(500).json({ error: 'Failed to update wishlist', details: error.message });
  }
});

// Get user's wishlist
// Get user's wishlist
router.get('/wishlist/:customerId', async (req, res) => {
  try {
    const wishlist = await StoreWishlist.find({ customerId: req.params.customerId })
      .populate({
        path: 'boutiqueId',
        model: 'Boutique' // Explicitly reference the model
      })
      .sort({ createdAt: -1 });

    res.status(200).json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Check if a store is in user's wishlist
router.get('/wishlist/check/:customerId/:boutiqueId', async (req, res) => {
  const { customerId, boutiqueId } = req.params;
  
  try {
    const wishlistItem = await StoreWishlist.findOne({ customerId, boutiqueId });
    res.status(200).json({ isFavorite: !!wishlistItem });
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    res.status(500).json({ error: 'Failed to check wishlist status' });
  }
});

// Remove a store from wishlist
router.delete('/wishlist/:customerId/:boutiqueId', async (req, res) => {
  const { customerId, boutiqueId } = req.params;
  
  try {
    const result = await StoreWishlist.deleteOne({ customerId, boutiqueId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }
    
    res.status(200).json({ message: 'Store removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;