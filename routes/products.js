const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Model3D = require("../models/Model3D");
// Obtenir tous les produits
router.get('/', async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'productId',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          averageRating: {
            $ifNull: [{ $avg: '$reviews.rating' }, 0]
          },
          totalReviews: {
            $size: '$reviews'
          }
        }
      },
      {
        $project: {
          reviews: 0
        }
      }
    ]);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour la route d'ajout de produit dans routes/products.js

router.post('/add', async (req, res) => {
  try {
    const { name, description, category, marque, couleur, prix, quantite_stock, image, model3D, type_verre, opticienId, style } = req.body;

    // Create product object with basic properties
    const productData = {
      name,
      description,
      category,
      marque,
      couleur,
      prix,
      quantite_stock,
      image,
      type_verre,
      style,
    };

    // Handle opticienId
    if (opticienId === "current_optician_id" || opticienId === "") {
      const DEV_OPTICIAN_ID = process.env.DEV_OPTICIAN_ID || "507f1f77bcf86cd799439011";
      console.log(`Using development optician ID: ${DEV_OPTICIAN_ID}`);
      productData.opticienId = new mongoose.Types.ObjectId(DEV_OPTICIAN_ID);
    } else if (mongoose.Types.ObjectId.isValid(opticienId)) {
      productData.opticienId = new mongoose.Types.ObjectId(opticienId);
    } else {
      return res.status(400).json({ 
        message: "Invalid opticienId format. Must be a valid MongoDB ObjectId",
        providedId: opticienId
      });
    }

    // Handle model3D - déterminer s'il s'agit d'un ID ou d'une URL
    if (model3D && model3D.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(model3D)) {
        // C'est un ID MongoDB valide
        productData.model3D = new mongoose.Types.ObjectId(model3D);
        productData.isModel3DObjectId = true;
      } else {
        // C'est une URL ou un chemin
        productData.model3D = model3D;
        productData.isModel3DObjectId = false;
      }
    }

    // Create and save the product
    const product = new Product(productData);
    const newProduct = await product.save();
    
    // If a model3D was provided as an ID, update the Model3D document
    if (model3D && mongoose.Types.ObjectId.isValid(model3D)) {
      try {
        await Model3D.findByIdAndUpdate(
          model3D,
          { productId: newProduct._id.toString() }
        );
      } catch (modelError) {
        console.error('Error updating model association:', modelError);
      }
    } else if (model3D && model3D.trim() !== '') {
      // Si c'est une URL/chemin, essayer de trouver le modèle correspondant
      try {
        const urlParts = model3D.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        await Model3D.findOneAndUpdate(
          { filePath: `/models/${fileName}` },
          { productId: newProduct._id.toString() }
        );
      } catch (modelError) {
        console.error('Error updating model association:', modelError);
      }
    }
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Helper function to extract model ID from path or URL
async function getModelIdFromPath(modelPath) {
  if (!modelPath || modelPath.trim() === '') {
    return null;
  }
  
  // If it's already a valid ObjectId string, return it as ObjectId
  if (mongoose.Types.ObjectId.isValid(modelPath)) {
    return new mongoose.Types.ObjectId(modelPath); // Changed here - add 'new'
  }
  
  // Extract the filename from the path or URL
  const urlParts = modelPath.split('/');
  const fileName = urlParts[urlParts.length - 1];
  
  try {
    // Find the Model3D document by filePath
    const model = await Model3D.findOne({ filePath: `/models/${fileName}` });
    
    // If found, return its ID as ObjectId
    if (model) {
      return model._id;
    }
    
    // If not found, return null
    return null;
  } catch (error) {
    console.error('Error finding model:', error);
    return null;
  }
}
// Mettre à jour un produit avec support pour model3D
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      // Vérifier si le model3D a changé
      const oldModel3D = product.model3D;
      const newModel3D = req.body.model3D;
      
      Object.assign(product, req.body);
      const updatedProduct = await product.save();
      
      // Si le modèle 3D a changé, mettre à jour les références
      if (newModel3D && newModel3D !== oldModel3D) {
        // Extraire le nom du fichier à partir du chemin
        const fileName = newModel3D.split('/').pop();
        
        // Mettre à jour le produitId dans la collection model3D
        await Model3D.updateOne(
          { filePath: `/models/${fileName}` },
          { productId: updatedProduct._id.toString() }
        );
      }
      
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer un produit avec gestion des modèles 3D associés
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (product) {
      // Si le produit a un modèle 3D, le supprimer également
      if (product.model3D && product.model3D.trim() !== '') {
        // Extraire le nom du fichier
        const fileName = product.model3D.split('/').pop();
        
        try {
          // Supprimer l'entrée du modèle 3D de la base de données
          await Model3D.findOneAndDelete({ filePath: `/models/${fileName}` });
          
          // Supprimer le fichier physique (cette partie doit être gérée par un middleware ou un service)
          // Cette partie peut être déplacée dans un service dédié
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(__dirname, '..', 'public', 'models', fileName);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (modelError) {
          console.error('Erreur lors de la suppression du modèle 3D:', modelError);
          // Ne pas bloquer la suppression du produit si la suppression du modèle échoue
        }
      }
      
      // Supprimer le produit
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: 'Produit supprimé' });
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir tous les produits avec modèle 3D
router.get('/with-3d-model', async (req, res) => {
  try {
    const products = await Product.find({ 
      model3D: { $exists: true, $ne: "" } 
    }).select('_id name model3D image');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les détails d'un modèle 3D spécifique
// Ajoutez cette route à votre fichier routes/products.js

// Route pour obtenir l'URL d'un modèle 3D à partir de son ID
router.get('/model3d-url/:modelId', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    
    // Vérifier si l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(modelId)) {
      return res.status(400).json({ message: 'ID de modèle invalide' });
    }
    
    // Rechercher le modèle 3D par son ID
    const model3D = await Model3D.findById(modelId);
    
    if (!model3D) {
      return res.status(404).json({ message: 'Modèle 3D non trouvé' });
    }
    
    // Renvoyer le chemin du fichier
    res.json({
      filePath: model3D.filePath,
      fileName: model3D.fileName,
      fileType: model3D.fileType
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL du modèle:', error);
    res.status(500).json({ message: error.message });
  }
});

// Route pour associer un modèle 3D existant à un produit
router.post('/associate-model3d', async (req, res) => {
  try {
    const { productId, model3DId } = req.body;
    
    if (!productId || !model3DId) {
      return res.status(400).json({ message: 'productId et model3DId sont requis' });
    }
    
    // Vérifier que le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    // Vérifier que le modèle 3D existe
    const model3D = await Model3D.findById(model3DId);
    if (!model3D) {
      return res.status(404).json({ message: 'Modèle 3D non trouvé' });
    }
    
    // Mettre à jour le produit avec le chemin du modèle 3D
    product.model3D = model3D.filePath;
    await product.save();
    
    // Mettre à jour le modèle 3D avec l'ID du produit
    model3D.productId = productId;
    await model3D.save();
    
    res.json({ 
      message: 'Modèle 3D associé avec succès au produit',
      product: {
        id: product._id,
        name: product.name,
        model3D: product.model3D
      }
    });
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
          from: 'reviews',
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
      .populate('userId', 'prenom nom')
      .sort({ createdAt: -1 });

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