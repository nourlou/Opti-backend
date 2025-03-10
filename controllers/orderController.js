const Order = require('../models/orderModel');
const axios = require('axios');
const User = require('../models/User');

// Créer une nouvelle commande
exports.createOrder = async (req, res) => {
  try {
    console.log('Creating order with data:', JSON.stringify(req.body));
    
    const orderData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Processing order data:', JSON.stringify(orderData));
    
    const newOrder = await Order.create(orderData);
    console.log('Order created in database with ID:', newOrder._id);
    
    // Double-check the order was saved by retrieving it
    const savedOrder = await Order.findById(newOrder._id);
    console.log('Order retrieved from database:', savedOrder ? 'SUCCESS' : 'FAILED');
    
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
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

// Récupérer toutes les commandes
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // Fetch all orders and sort by creation date
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message,
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

const sendOneSignalNotification = async (playerId, message, orderId, newStatus) => {
  const oneSignalAppId = 'e2715d8a-cf44-4523-8078-dbe2285a792b';
  const oneSignalRestApiKey = 'os_v2_app_4jyv3cwpircshady3prcqwtzfp6xxy3mxriuv4f2anhplthp3giand35gcr3inxjw7dxfz2gtikbzsunfp4m7ljiluajudp5fh5hbaa';
  const notificationTitle = `🚀 Commande #${orderId.slice(-6)}`;
  const notificationMessage = `Statut mis à jour: ${newStatus} ➡️ ${message}`;
  try {
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: oneSignalAppId,
        include_player_ids: [playerId],
        contents: { en: notificationMessage }, // Notification message
        headings: { en: notificationTitle }, // Notification title
        data: { orderId, newStatus },
        buttons: [
          { id: "view_order", text: "Voir la commande", icon: "ic_menu_view" },
          { id: "cancel", text: "Annuler", icon: "ic_menu_cancel" }
        ],
        // Add a large icon or image
        large_icon: 'https://your-app.com/logo.png', // URL to your app icon
        ios_attachments: { id: 'https://your-app.com/image.jpg' }, // iOS-specific image
        android_accent_color: 'FF00FF00', // Green accent color for Android
        android_small_icon: 'ic_stat_onesignal_default', // Custom small icon
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${oneSignalRestApiKey}`,
        },
      }
    );

    console.log('Notification sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send notification:', error.response?.data || error.message);
    throw error;
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
    
    // Find the order first
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    // Get the userId from the order
    const userId = order.userId;
    
    // Find the user associated with this order to get playerId
    const user = await User.findById(userId);
    
    if (user && user.oneSignalPlayerId) {
      // Send notification if user has a player ID
      try {
        await sendOneSignalNotification(
          user.oneSignalPlayerId,
          `Le statut de votre commande #${order._id.toString().slice(-6)} a été mis à jour: ${status}`,
          id,
          status
        );
        console.log(`Notification sent to user ${userId} with player ID: ${user.oneSignalPlayerId}`);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
    } else {
      console.log(`No OneSignal Player ID found for user ${userId}`);
    }
    
    // Update the order status
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
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
    console.log(`Deleting order with ID: ${id}`);

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }

    // Check if the order can be canceled
    if (['En livraison', 'Livrée'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler une commande qui est déjà en livraison ou livrée',
      });
    }

    // Get the user ID from the order
    const userId = order.userId;
    
    // Notify the user about cancellation
    try {
      const user = await User.findById(userId);
      if (user && user.oneSignalPlayerId) {
        await sendOneSignalNotification(
          user.oneSignalPlayerId,
          `Votre commande #${order._id.toString().slice(-6)} a été annulée.`,
          id,
          'Annulée'
        );
        console.log(`Cancellation notification sent to user ${userId}`);
      }
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
    }

    // Delete the order
    await Order.findByIdAndDelete(id);
    console.log('Order deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Commande supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la commande',
      error: error.message,
    });
  }
};