const express = require('express');
const router = express.Router();
const Opticien = require('../models/Opticien');

router.get('/', async (req, res) => {
  try {
    console.log('[Optician Route] Fetching opticians...');
    const opticiens = await Opticien.find();
    
    if (!opticiens || opticiens.length === 0) {
      console.log('[Optician Route] No opticians found');
      return res.status(200).json([]); // Return empty array instead of error
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

module.exports = router;
