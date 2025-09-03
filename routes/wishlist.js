const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Get user's wishlist by email
router.get('/user/:userEmail', async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    console.log('Fetching wishlist for user:', userEmail);

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('User not found:', userEmail);
      return res.status(404).json({ message: 'User not found' });
    }

    const wishlist = await Wishlist.findOne({ userId: user._id })
      .populate({
        path: 'products.productId',
        select: 'name description category marque couleur prix quantiteStock image type_verre opticienId'
      });

    res.json(wishlist ? wishlist.products : []);
  } catch (err) {
    console.error('Error in get wishlist:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Add to wishlist
router.post('/', async (req, res) => {
  try {
    const { productId, userEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let wishlist = await Wishlist.findOne({ userId: user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: user._id,
        products: [{ productId }]
      });
    } else {
      const exists = wishlist.products.some(p => 
        p.productId.toString() === productId
      );
      if (exists) return res.status(400).json({ message: 'Product already in wishlist' });
      wishlist.products.push({ productId });
    }

    await wishlist.save();
    const savedWishlist = await Wishlist.findOne({ userId: user._id })
      .populate('products.productId');

    res.status(201).json(savedWishlist.products.at(-1));
  } catch (err) {
    console.error('Error in add to wishlist:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete from wishlist (simplified)
router.delete('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dfghjkl");
    const wishlist = await Wishlist.findOne({ userId: decoded.id });

    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(
      item => item.productId.toString() !== productId
    );

    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await wishlist.save();
    res.json({ message: 'Item removed successfully' });
  } catch (err) {
    console.error('Error in remove from wishlist:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Check if product is in wishlist
router.get('/check/:userEmail/:productId', async (req, res) => {
  try {
    const { userEmail, productId } = req.params;
    const user = await User.findOne({ email: userEmail });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const wishlist = await Wishlist.findOne({ userId: user._id });
    const exists = wishlist?.products.some(
      p => p.productId.toString() === productId
    ) ?? false;

    res.json({ isInWishlist: exists });
  } catch (err) {
    console.error('Error in check wishlist:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;