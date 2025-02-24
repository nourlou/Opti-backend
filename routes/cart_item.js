const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const CartItem = require('../models/Cart_item');

// Add an item to the cart
router.post('/', async (req, res) => {
  try {
    const { userId, productId, quantity, totalPrice } = req.body;

    // Validate required fields
    if (!userId || !productId || !quantity || !totalPrice) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find or create a cart for the user
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    // Check if the item already exists in the cart
    let cartItem = await CartItem.findOne({ userId, productId });

    if (cartItem) {
      // Update the existing item
      cartItem.quantity = quantity;
      cartItem.totalPrice = totalPrice;
      cartItem.updatedAt = new Date();
      await cartItem.save();
    } else {
      // Create a new cart item
      cartItem = new CartItem({
        userId,
        productId,
        quantity,
        totalPrice,
      });
      await cartItem.save();

      // Add the item to the cart
      cart.items.push(cartItem._id);
      await cart.save();
    }

    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Error while adding item to cart:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get cart items for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const cart = await Cart.findOne({ userId }).populate('items');
    
    if (!cart) {
      return res.json({ items: [] });
    }

    res.json({ items: cart.items });
  } catch (error) {
    console.error('Error while retrieving cart items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update cart item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, totalPrice } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }

    const cartItem = await CartItem.findById(id);
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = totalPrice;
    cartItem.updatedAt = new Date();
    await cartItem.save();

    res.json(cartItem);
  } catch (error) {
    console.error('Error while updating cart item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete cart item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid item ID' });
    }

    // Delete the cart item
    const cartItem = await CartItem.findById(id);
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Remove the item from the cart
    await Cart.updateOne(
      { userId: cartItem.userId },
      { $pull: { items: id } }
    );

    // Delete the cart item
    await cartItem.deleteOne();

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error while deleting cart item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Clear cart
router.delete('/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Delete all cart items
    await CartItem.deleteMany({ _id: { $in: cart.items } });

    // Clear the cart items array
    cart.items = [];
    await cart.save();

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error while clearing cart:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

