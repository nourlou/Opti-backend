const express = require('express');
const router = express.Router();
const Opticien = require('../models/Opticien');

// GET all opticians
router.get('/', async (req, res) => {
  try {
    console.log('[Optician Route] Fetching opticians...');
    const opticiens = await Opticien.find();
    
    console.log(`[Optician Route] Retrieved from DB:`, opticiens);
    
    if (!opticiens || opticiens.length === 0) {
      console.log('[Optician Route] No opticians found');
      return res.status(200).json([]); // Retourne une liste vide
    }
    
    console.log(`[Optician Route] Successfully fetched ${opticiens.length} opticians`);
    res.status(200).json(opticiens);
  } catch (error) {
    console.error('[Optician Route] Error fetching opticians:', error);
    res.status(500).json({
      message: 'Error fetching opticians',
      error: error.message
    });
  }
});

// POST - Add a new optician
router.post('/', async (req, res) => {
  try {
    console.log('[Optician Route] Creating new optician:', req.body);

    // Ensure that the `_id` field is not included in the request body
    const { _id, ...opticianData } = req.body;

    // Check if all required fields are present
    const requiredFields = ['nom', 'adresse', 'phone', 'email', 'description', 'opening_hours'];
    const missingFields = requiredFields.filter(field => !opticianData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields: missingFields
      });
    }

    const optician = new Opticien(opticianData);
    const savedOptician = await optician.save();
    
    console.log('[Optician Route] Optician created successfully:', savedOptician);
    res.status(201).json(savedOptician);
  } catch (error) {
    console.error('[Optician Route] Error creating optician:', error);
    res.status(500).json({
      message: 'Error creating optician',
      error: error.message
    });
  }
});
// GET a secific optician by ID
router.get('/:id', async (req, res) => {
  try {
    console.log(`[Optician Route] Fetching optician with id: ${req.params.id}`);
    const optician = await Opticien.findById(req.params.id);
    
    if (!optician) {
      console.log(`[Optician Route] No optician found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Optician not found' });
    }
    
    console.log('[Optician Route] Optician found:', optician);
    res.status(200).json(optician);
  } catch (error) {
    console.error('[Optician Route] Error fetching optician:', error);
    res.status(500).json({
      message: 'Error fetching optician',
      error: error.message
    });
  }
});

// PUT - Update an optician
router.put('/:id', async (req, res) => {
  try {
    console.log(`[Optician Route] Updating optician with id: ${req.params.id}`);
    const updatedOptician = await Opticien.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedOptician) {
      console.log(`[Optician Route] No optician found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Optician not found' });
    }
    
    console.log('[Optician Route] Optician updated successfully:', updatedOptician);
    res.status(200).json(updatedOptician);
  } catch (error) {
    console.error('[Optician Route] Error updating optician:', error);
    res.status(500).json({
      message: 'Error updating optician',
      error: error.message
    });
  }
});

// DELETE - Remove an optician
router.delete('/:id', async (req, res) => {
  try {
    console.log(`[Optician Route] Deleting optician with id: ${req.params.id}`);
    const deletedOptician = await Opticien.findByIdAndDelete(req.params.id);
    
    if (!deletedOptician) {
      console.log(`[Optician Route] No optician found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Optician not found' });
    }
    
    console.log('[Optician Route] Optician deleted successfully');
    res.status(200).json({ message: 'Optician deleted successfully' });
  } catch (error) {
    console.error('[Optician Route] Error deleting optician:', error);
    res.status(500).json({
      message: 'Error deleting optician',
      error: error.message
    });
  }
});

module.exports = router;