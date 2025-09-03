const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const axios = require('axios');

const router = express.Router();

// Google Perspective API integration
async function checkToxicity(text) {
  const API_KEY ='AIzaSyBRKWdoV1GUDqQcBzeLX-gP85ly6r13wZ4'; // Replace with your actual API key
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
    
    // You can adjust these thresholds based on your moderation needs
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
    // Return false if API fails, allowing reviews to go through rather than blocking them
    return { isToxic: false, scores: {} };
  }
}

// Submit a review with content moderation
router.post('/reviews', async (req, res) => {
    const { productId, userId, reviewText, rating } = req.body;

    if (!productId || !userId || !reviewText || rating === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check review text for toxicity
        const toxicityCheck = await checkToxicity(reviewText);
        
        if (toxicityCheck.isToxic) {
            return res.status(400).json({ 
                error: 'Your review contains inappropriate language',
                toxicityScores: toxicityCheck.scores
            });
        }

        const newReview = new Review({ productId, userId, reviewText, rating });
        await newReview.save();
        const savedReview = await newReview.save();
    
        // Calculate new rating statistics
        const reviews = await Review.find({ productId });
        const totalReviews = reviews.length;
        let averageRating = 0;
        
        if (totalReviews > 0) {
          const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
          averageRating = sum / totalReviews;
        }
        
        // Update product with new rating data
        await Product.findByIdAndUpdate(productId, {
          averageRating,
          totalReviews
        });
        res.status(201).json(newReview);
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

router.get('/reviews/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
      const reviews = await Review.find({ productId })
        .populate('userId', 'name avatarUrl') // Populate user details
        .sort({ timestamp: -1 });
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });
  router.delete('/reviews/:reviewId', async (req, res) => {
    const { reviewId } = req.params;
    const { userId } = req.body;

    try {
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        if (review.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Store product ID before deletion
        const productId = review.productId;

        await review.deleteOne();

        // Recalculate ratings using the stored productId
        const remainingReviews = await Review.find({ productId });
        const totalReviews = remainingReviews.length;
        let averageRating = 0;
        
        if (totalReviews > 0) {
            const sum = remainingReviews.reduce((acc, review) => acc + review.rating, 0);
            averageRating = sum / totalReviews;
        }
        
        await Product.findByIdAndUpdate(productId, {
            averageRating,
            totalReviews
        });
        
        res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Review deletion error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

module.exports = router;