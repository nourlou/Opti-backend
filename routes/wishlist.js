const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

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
        select: 'name description category marque couleur prix quantiteStock image type_verre opticienId' // Ajout de 'image'
      });

    if (!wishlist) {
      return res.json([]);
    }

    // Transform the data to match your frontend expectations
    const transformedProducts = wishlist.products.map(item => ({
      _id: item._id,
      productId: {
        ...item.productId.toObject(),
        imageUrl: item.productId.image ? `http://localhost:3000/ProductImages/${item.productId.image}` : null
      },
      userId: wishlist.userId,
      createdAt: item.addedAt,
      updatedAt: wishlist.updatedAt
    }));

    console.log('Transformed products:', JSON.stringify(transformedProducts, null, 2));
    res.json(transformedProducts);
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
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ userId: user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: user._id,
        products: [{ productId }]
      });
    } else {
      // Check if product already exists
      const productExists = wishlist.products.some(p => 
        p.productId.toString() === productId
      );
      
      if (!productExists) {
        wishlist.products.push({ productId });
      } else {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }
    }

    await wishlist.save();

    // Return the newly added product with populated data
    const savedWishlist = await Wishlist.findOne({ userId: user._id })
      .populate({
        path: 'products.productId',
        select: 'name description category marque couleur prix quantiteStock imageUrl typeVerre opticienId'
      });

    const newProduct = savedWishlist.products[savedWishlist.products.length - 1];
    
    res.status(201).json({
      _id: newProduct._id,
      productId: newProduct.productId,
      userId: wishlist.userId,
      createdAt: newProduct.addedAt,
      updatedAt: wishlist.updatedAt
    });
  } catch (err) {
    console.error('Error in add to wishlist:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Remove from wishlist
router.delete('/:id', async (req, res) => {
  try {
    const wishlistItemId = req.params.id;
    
    const wishlist = await Wishlist.findOne({
      'products._id': wishlistItemId
    });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    wishlist.products = wishlist.products.filter(
      product => product._id.toString() !== wishlistItemId
    );

    await wishlist.save();
    res.json({ message: 'Item removed from wishlist' });
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
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const wishlist = await Wishlist.findOne({ userId: user._id });
    const isInWishlist = wishlist?.products.some(
      product => product.productId.toString() === productId
    ) || false;

    res.json({ isInWishlist });
  } catch (err) {
    console.error('Error in check wishlist:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;