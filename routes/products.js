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


module.exports = router;