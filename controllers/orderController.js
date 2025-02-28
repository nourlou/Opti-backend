const Order = require('../models/orderModel');

// Créer une nouvelle commande
exports.createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newOrder = await Order.create(orderData);
    
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: 'Erreur lors de la création de la commande',
      error: error.message
    });
  }
};

// Récupérer toutes les commandes d'un utilisateur
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json(orders);
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message
    });
  }
};

// Récupérer une commande par son ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: 'Erreur lors de la récupération de la commande',
      error: error.message
    });
  }
};

// Mettre à jour le statut d'une commande
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Le statut est requis'
      });
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour du statut de la commande',
      error: error.message
    });
  }
};

// Annuler une commande
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Vérifier si la commande peut être annulée (par exemple, pas déjà en cours de livraison)
    if (['En livraison', 'Livrée'].includes(order.status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Impossible d\'annuler une commande qui est déjà en livraison ou livrée'
      });
    }
    
    order.status = 'Annulée';
    order.updatedAt = new Date();
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Commande annulée avec succès'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: 'Erreur lors de l\'annulation de la commande',
      error: error.message
    });
  }
};