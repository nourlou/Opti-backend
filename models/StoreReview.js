const mongoose = require('mongoose');

const StorereviewSchema = new mongoose.Schema({
    boutiqueId: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewText: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StoreReview', StorereviewSchema);