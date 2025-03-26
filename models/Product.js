// Modifiez votre fichier models/Product.js pour uniformiser la gestion des modèles 3D

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  marque: { type: String, required: true },
  couleur: { type: String, required: true },
  prix: { type: Number, required: true },
  quantite_stock: { type: Number, required: true },
  image: { type: String },
  
  // Définir model3D comme une référence vers Model3D OU comme un String
  model3D: {
    type: mongoose.Schema.Types.Mixed, // Permet de stocker soit un ObjectId, soit une chaîne
    default: null,
  },
  
  type_verre: { type: String, required: true },
  style: { type: String },
  opticienId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opticien',
    required: true,
  },
  
  // Ajout d'un boolean pour indiquer si model3D est un ID ou une URL
  isModel3DObjectId: {
    type: Boolean,
    default: false
  }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;