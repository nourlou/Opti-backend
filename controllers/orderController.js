const Order = require('../models/orderModel');
const axios = require('axios');
const User = require('../models/User');

// Créer une nouvelle commande
// Delete an order permanently
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Permanently deleting order with ID: ${id}`);

    // Find the order first to check if it exists
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Get the user associated with this order for notification purposes
    const userId = order.userId;
    const user = await User.findById(userId);

    // Delete the order
    const deletedOrder = await Order.findByIdAndDelete(id);
    
    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: 'La commande n\'a pas pu être supprimée'
      });
    }

    // Send notification to the user if they have a OneSignal player ID
    if (user && user.oneSignalPlayerId) {
      const notificationMessage = `Votre commande #${order._id.toString().slice(-6)} a été supprimée définitivement.`;
      
      try {
        await sendOneSignalNotification(
          user.oneSignalPlayerId,
          notificationMessage,
          id,
          'Supprimée'
        );
        console.log(`Deletion notification sent to user ${userId}`);
      } catch (notificationError) {
        console.error('Failed to send deletion notification:', notificationError);
      }
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Commande supprimée définitivement'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression définitive de la commande',
      error: error.message
    });
  }
};
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
    const { status, cancellationReason } = req.body; // Add cancellationReason to the request body

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

    // Prepare the update fields
    const updateFields = {
      status,
      updatedAt: new Date(),
    };

    // Add cancellation reason if the status is "Annulée"
    if (status === 'Annulée' && cancellationReason) {
      updateFields.cancellationReason = cancellationReason;
    }

    // Update the order status (and cancellation reason if applicable)
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    // Get the user associated with this order to send a notification
    const userId = order.userId;
    const user = await User.findById(userId);

    if (user && user.oneSignalPlayerId) {
      // Prepare the notification message
      let notificationMessage = `Le statut de votre commande #${order._id.toString().slice(-6)} a été mis à jour: ${status}`;

      // Include the cancellation reason in the notification if applicable
      if (status === 'Annulée' && cancellationReason) {
        notificationMessage += `\nRaison: ${cancellationReason}`;
      }

      // Send the notification
      try {
        await sendOneSignalNotification(
          user.oneSignalPlayerId,
          notificationMessage,
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

    // Return the updated order
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
    const { cancellationReason } = req.body; // Add cancellationReason to the request body
    console.log(`Canceling order with ID: ${id}`);

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }

    // Check if the order can be canceled
    if (['En livraison', 'Completée'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler une commande qui est déjà en livraison ou livrée',
      });
    }

    // Update the order status to "Annulée" and include the cancellation reason
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        status: 'Annulée',
        cancellationReason, // Save the cancellation reason
        updatedAt: new Date(),
      },
      { new: true }
    );

    // Get the user associated with this order to send a notification
    const userId = order.userId;
    const user = await User.findById(userId);

    if (user && user.oneSignalPlayerId) {
      // Prepare the notification message
      let notificationMessage = `Votre commande #${order._id.toString().slice(-6)} a été annulée.`;

      // Include the cancellation reason in the notification
      if (cancellationReason) {
        notificationMessage += `\nRaison: ${cancellationReason}`;
      }

      // Send the notification
      try {
        await sendOneSignalNotification(
          user.oneSignalPlayerId,
          notificationMessage,
          id,
          'Annulée'
        );
        console.log(`Cancellation notification sent to user ${userId}`);
      } catch (notificationError) {
        console.error('Failed to send cancellation notification:', notificationError);
      }
    }

    // Return success response
    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Commande annulée avec succès',
    });
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la commande',
      error: error.message,
    });
  }
};