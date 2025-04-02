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
  type_verre: { type: String, required: true },
  style: { type: String, required: true }, // Champ ajouté pour décrire le style ou la silhouette de la lunette
  opticienId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opticien',
    required: true
  },
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
