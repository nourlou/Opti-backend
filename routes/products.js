const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Obtenir tous les produits
// routes/products.js
router.get('/', async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: 'reviews', // Join with the reviews collection
          localField: '_id', // Product ID
          foreignField: 'productId', // Review's productId field
          as: 'reviews' // Store joined reviews in this field
        }
      },
      {
        $addFields: {
          // Calculate average rating dynamically
          averageRating: {
            $ifNull: [{ $avg: '$reviews.rating' }, 0] // Default to 0 if no reviews
          },
          // Calculate total reviews dynamically
          totalReviews: {
            $size: '$reviews' // Count the number of reviews
          }
        }
      },
      {
        $project: {
          reviews: 0 // Exclude the reviews array from the final output
        }
      }
    ]);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Créer un nouveau produit
router.post('/add', async (req, res) => {
  const product = new Product({
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    marque: req.body.marque,
    couleur: req.body.couleur,
    prix: req.body.prix,
    quantite_stock: req.body.quantite_stock,
    image: req.body.image,
    type_verre: req.body.type_verre,
    opticienId: req.body.opticienId,
    style: req.body.style, // New style field
  });

  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mettre à jour un produit
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      Object.assign(product, req.body);
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer un produit
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (product) {
      res.json({ message: 'Produit supprimé' });
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/ratings/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    const ratingData = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(productId) } },
      {
        $lookup: {
          from: 'reviews', // Assuming your reviews collection is named 'reviews'
          localField: '_id',
          foreignField: 'productId',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          averageRating: { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
          totalReviews: { $size: '$reviews' }
        }
      },
      {
        $project: {
          averageRating: 1,
          totalReviews: 1,
          reviews: 1
        }
      }
    ]);

    if (ratingData.length > 0) {
      res.json({
        averageRating: ratingData[0].averageRating,
        totalReviews: ratingData[0].totalReviews
      });
    } else {
      res.json({
        averageRating: 0,
        totalReviews: 0
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get detailed reviews for a product
router.get('/reviews/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    const reviews = await Review.find({ productId: productId })
      .populate('userId', 'prenom nom') // Assuming you want to include user details
      .sort({ createdAt: -1 }); // Sort by most recent first

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new review
router.post('/reviews/add', async (req, res) => {
  try {
    const { productId, userId, rating, comment } = req.body;

    const newReview = new Review({
      productId,
      userId,
      rating,
      comment,
      createdAt: new Date()
    });

    const savedReview = await newReview.save();

    // Recalculate and update product's average rating
    const reviews = await Review.find({ productId });
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await Product.findByIdAndUpdate(productId, { 
      averageRating: averageRating 
    });

    res.status(201).json(savedReview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


module.exports = router;