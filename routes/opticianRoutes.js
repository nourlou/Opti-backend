// opticianRoutes.js
const express = require('express');
const router = express.Router();
const Optician = require('../models/opticianModel');

// Get all opticians
router.get('/opticians', async (req, res) => {
  try {
    const opticians = await Optician.find();
    res.status(200).json(opticians);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new optician
router.post('/opticians', async (req, res) => {
  const optician = new Optician(req.body);
  try {
    const newOptician = await optician.save();
    res.status(201).json(newOptician);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an optician
router.put('/opticians/:id', async (req, res) => {
  try {
    const optician = await Optician.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!optician) {
      return res.status(404).json({ message: 'Optician not found' });
    }
    res.status(200).json(optician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an optician
router.delete('/opticians/:id', async (req, res) => {
  try {
    const optician = await Optician.findByIdAndDelete(req.params.id);
    if (!optician) {
      return res.status(404).json({ message: 'Optician not found' });
    }
    res.status(200).json({ message: 'Optician deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;