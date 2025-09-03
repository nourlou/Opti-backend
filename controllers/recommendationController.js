const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const Product = require('../models/Product');

// GET recommendations for a specific face shape
router.get('/recommendations/:faceShape', async (req, res) => {
  try {
    const { faceShape } = req.params;
    
    // Find recommendations for the given face shape
    const recommendation = await Recommendation.findOne({ 
      formeVisage: { $regex: new RegExp(faceShape, 'i') } 
    });
    
    if (!recommendation) {
      return res.status(404).json({ 
        message: 'Aucune recommandation trouvée pour cette forme de visage' 
      });
    }
    
    // Find products matching the recommended styles
    const products = await Product.find({
      style: { $in: recommendation.stylesRecommendées }
    }).limit(10);
    
    res.json({
      formeVisage: recommendation.formeVisage,
      stylesRecommendées: recommendation.stylesRecommendées,
      products: products
    });
    
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;