const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  formeVisage: { type: String, required: true }, // ex: "Ovale", "Rond", "Carré", "Rectangulaire", etc.
  stylesRecommendées: [{ type: String, required: true }] // Liste des styles de lunettes recommandés pour cette forme
});


const Recommendation = mongoose.model('Recommendation', recommendationSchema);
module.exports = Recommendation;
