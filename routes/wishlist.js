const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get user's wishlist with populated product details
router.get('/user/:userId', async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.params.userId })
      .populate({
        path: 'productId',
        select: 'name description category marque couleur prix quantiteStock imageUrl typeVerre opticienId'
      });

    res.json(wishlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Add to wishlist
router.post('/', async (req, res) => {
  try {
    const { productId, userId } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid product or user ID' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create new wishlist item
    const wishlistItem = new Wishlist({
      productId,
      userId
    });

    await wishlistItem.save();

    // Populate product details before sending response
    const populatedItem = await Wishlist.findById(wishlistItem._id)
      .populate({
        path: 'productId',
        select: 'name description category marque couleur prix quantiteStock imageUrl typeVerre opticienId'
      });

    res.status(201).json(populatedItem);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Item already in wishlist' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Remove from wishlist
router.delete('/:id',  async (req, res) => {
  try {
    const wishlistItem = await Wishlist.findById(req.params.id);
    
    if (!wishlistItem) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    // Ensure user owns the wishlist item
    if (wishlistItem.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await wishlistItem.remove();
    res.json({ message: 'Item removed from wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Check if product is in user's wishlist
router.get('/check/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    const wishlistItem = await Wishlist.findOne({ userId, productId });
    res.json({ isInWishlist: !!wishlistItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;