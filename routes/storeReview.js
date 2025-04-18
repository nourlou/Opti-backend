const express = require('express');
const BoutiqueReview = require('../models/StoreReview');
const Boutique = require('../models/Boutique');
const axios = require('axios');
const StoreReview = require('../models/StoreReview');

const router = express.Router();

// Google Perspective API integration
async function checkToxicity(text) {
  const API_KEY = 'AIzaSyBRKWdoV1GUDqQcBzeLX-gP85ly6r13wZ4'; // Replace with your actual API key
  const PERSPECTIVE_API_URL = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${API_KEY}`;

  try {
    const response = await axios.post(PERSPECTIVE_API_URL, {
      comment: { text },
      languages: ['en', 'fr', 'ar'], // Specify languages you want to support
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {}
      }
    });

    // Check if any attribute exceeds threshold
    const results = response.data.attributeScores;
    const toxicityScore = results.TOXICITY.summaryScore.value;
    const profanityScore = results.PROFANITY.summaryScore.value;
    
    return {
      isToxic: toxicityScore > 0.7 || profanityScore > 0.7,
      scores: {
        toxicity: toxicityScore,
        profanity: profanityScore,
        identity_attack: results.IDENTITY_ATTACK.summaryScore.value,
        insult: results.INSULT.summaryScore.value,
        threat: results.THREAT.summaryScore.value
      }
    };
  } catch (error) {
    console.error('Perspective API error:', error.response?.data || error.message);
    // Allow reviews to proceed if API fails
    return { isToxic: false, scores: {} };
  }
}

router.post('/boutique-reviews', async (req, res) => {
  const { boutiqueId, customerId, reviewText, rating } = req.body;

  if (!boutiqueId || !customerId || !reviewText || rating === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
      // Check for toxicity if needed
      const toxicityResult = await checkToxicity(reviewText);
      if (toxicityResult.isToxic) {
          return res.status(400).json({
              error: 'Review contains inappropriate language',
              toxicityScores: toxicityResult.scores
          });
      }

      // Create and save the new review
      const newBoutiqueReview = new BoutiqueReview({ 
          boutiqueId, 
          customerId,
          reviewText, 
          rating,
          timestamp: new Date()
      });
      
      await newBoutiqueReview.save();
      
      // Update the boutique's total reviews and average rating
      const averageRating = await calculateAverageRating(boutiqueId);
      await Boutique.findByIdAndUpdate(
          boutiqueId,
          { 
              $inc: { totalReviews: 1 },
              $set: { averageRating: averageRating }
          }
      );
      
      res.status(201).json(newBoutiqueReview);
  } catch (error) {
      console.error('Boutique review submission error:', error);
      res.status(500).json({ error: 'Failed to submit boutique review' });
  }
});
async function calculateAverageRating(boutiqueId) {
  const result = await StoreReview.aggregate([
    { $match: { boutiqueId } },
    { $group: { _id: null, average: { $avg: "$rating" } } }
  ]);
  return result[0]?.average || 0;
}

// routes/reviews.js
router.get('/boutique-reviews/:boutiqueId', async (req, res) => {
  const { boutiqueId } = req.params;
  try {
      const reviews = await BoutiqueReview.find({ boutiqueId }) // Changed from BoutiqueReview to StoreReview
          .populate('customerId', 'nom imageUrl') // Changed from userId to customerId
          .sort({ timestamp: -1 });

      res.json(reviews);
  } catch (error) {
      console.error('Error fetching boutique reviews:', error);
      res.status(500).json({ error: 'Failed to fetch boutique reviews', details: error.message });
  }
});

router.delete('/boutique-reviews/:reviewId', async (req, res) => {
  const { reviewId } = req.params;
  const { customerId } = req.body;

  try {
    const review = await BoutiqueReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({ error: 'Boutique review not found' });
    }

    // Check if customerId exists in the review
    if (!review.customerId) {
      console.error('Review has no customerId:', review);
      return res.status(500).json({ error: 'Review data is corrupted (missing customerId)' });
    }

    // Convert both IDs to strings for comparison
    const reviewCustomerId = review.customerId.toString();
    
    if (reviewCustomerId !== customerId) {
      return res.status(403).json({ error: 'You are not authorized to delete this review' });
    }

    // Store the boutiqueId before deleting the review
    const boutiqueId = review.boutiqueId;

    // Delete the review
    await review.deleteOne();
    
    // Update the boutique's total reviews and average rating
    const averageRating = await calculateAverageRating(boutiqueId);
    await Boutique.findByIdAndUpdate(
      boutiqueId,
      { 
        $inc: { totalReviews: -1 }, // Decrease total reviews count
        $set: { averageRating: averageRating } // Update average rating
      }
    );

    res.status(200).json({ message: 'Boutique review deleted successfully' });
  } catch (error) {
    console.error('Boutique review deletion error:', error);
    res.status(500).json({ error: 'Failed to delete boutique review' });
  }
});
router.get('/boutique-stats/:boutiqueId', async (req, res) => {
  const { boutiqueId } = req.params;
  
  try {
      const boutique = await Boutique.findById(boutiqueId);
      if (!boutique) {
          return res.status(404).json({ error: 'Boutique not found' });
      }
      
      res.json({
          averageRating: boutique.averageRating || 0,
          totalReviews: boutique.totalReviews || 0
      });
  } catch (error) {
      console.error('Error fetching boutique stats:', error);
      res.status(500).json({ error: 'Failed to fetch boutique stats' });
  }
});

module.exports = router;
