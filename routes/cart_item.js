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
      cartItem.quantity += quantity; // Increment the quantity
      cartItem.totalPrice += totalPrice; // Recalculate the total price
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
// Get cart items for a user
// Get cart items for a user
// Get cart items for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    // Log the incoming request
    console.log('Received request to get cart items for userId:', userId);

    if (!userId) {
      console.warn('userId is required');
      return res.status(400).json({ message: 'userId is required' });
    }

    const cart = await Cart.findOne({ userId }).populate('items');

    if (!cart) {
      console.log(`No cart found for userId: ${userId}`);
      return res.json({ items: [] });
    }

    console.log(`Cart found for userId: ${userId}, items:`, cart.items);
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

    // Return 204 No Content
    res.status(204).end();
  } catch (error) {
    console.error('Error while deleting cart item:', error);
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;

