// server.js or routes/recommendations.js
const express = require('express');
const router = express.Router();
const Recommendation = require('../models/Recommendation');
const Product = require('../models/Product');

// Get recommendations and matching products for a specific face shape
router.get('/recommendations/:faceShape', async (req, res) => {
  try {
    const { faceShape } = req.params;
    console.log('Requested face shape:', req.params.faceShape);
    
    // Find recommendation for the given face shape
    const recommendation = await Recommendation.findOne({ 
      formeVisage: faceShape 
    });
    
    if (!recommendation) {
      return res.status(404).json({ 
        message: 'Aucune recommandation trouvée pour cette forme de visage',
        stylesRecommendées: []
      });
    }
    
    // Find products that match the recommended styles
    const products = await Product.find({
      style: { $in: recommendation.stylesRecommendées }
    }).limit(10); // Limit to 10 products for performance
    
    return res.status(200).json({
      stylesRecommendées: recommendation.stylesRecommendées,
      products: products.map(product => ({
        id: product._id,
        name: product.name,
        style: product.style,
        price: product.prix,
        imageUrl: product.image || 'https://via.placeholder.com/150',
        marque: product.marque,
        couleur: product.couleur
      }))
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des recommandations',
      error: error.message
    });
  }
});

module.exports = router;

