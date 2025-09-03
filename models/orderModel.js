const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  opticienId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opticien',
    required: true
  }
});


const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  items: [
    {
      productId: String,
      productName: String,
      productImage: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      opticienId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Opticien'
      }
    }
  ],
  address: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['En attente', 'Confirmée', 'En livraison', 'Completée', 'Annulée'],
    default: 'En attente'
  },
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  opticienId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opticien',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  cancellationReason: {
    type: String,
    required: false
  }
});

// Add this line to export the model
module.exports = mongoose.model('Order', orderSchema);