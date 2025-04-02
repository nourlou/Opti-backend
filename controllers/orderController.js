const Order = require('../models/orderModel');
const axios = require('axios');
const User = require('../models/User');
const Product = require('../models/Product');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const Opticien = require('../models/Boutique');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Ou un autre service comme 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    pass: process.env.EMAIL_PASS || 'xqzc yhwk kdvi pmdy'
  }
});

// Helper function to generate status tracking HTML
const generateStatusTracking = (currentStatus) => {
  const statuses = ['En attente', 'Confirmée', 'En livraison', 'Completée', 'Annuller'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  let trackingHTML = '<div style="display: flex; justify-content: space-between; margin: 20px 0;">';
  
  statuses.forEach((status, index) => {
    const isCompleted = index <= currentIndex;
    const color = isCompleted ? '#4CAF50' : '#E0E0E0';
    const textColor = isCompleted ? '#FFFFFF' : '#757575';
    
    // Add missing content here
    trackingHTML += `<div style="text-align: center;">
      <div style="background-color: ${color}; color: ${textColor}; padding: 10px; border-radius: 5px;">${status}</div>
    </div>`;
  });
  
  trackingHTML += '</div>';
  return trackingHTML;
};
// Créer une nouvelle commande
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
  

// Helper function to get status description
const getStatusDescription = (status) => {
  const descriptions = {
    'En attente': 'Votre commande a été reçue et est en attente de traitement.',
    'Confirmée': 'Votre commande a été confirmée et sera préparée prochainement.',
    'En livraison': 'Votre commande est en route vers votre adresse de livraison.',
    'Completée': 'Votre commande a été livrée avec succès. Merci pour votre confiance!',
    'Annuller': 'Votre commande a été annulée. Si vous avez des questions, contactez-nous.'
  };
  
  return descriptions[status] || 'Statut mis à jour.';
};

// Helper function to send email notification
const sendOrderStatusEmail = async (user, order, newStatus) => {
  try {
    // Read email template
    const templatePath = path.join(__dirname, '../templates/order-status-email.html');
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    const viewOrderDeepLink = `optiapp://vieworder?id=${order._id}`;
    // Format date
    const formattedDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Calculate estimated delivery time based on status
    let estimatedDelivery = '';
    if (newStatus === 'En préparation') {
      estimatedDelivery = '45-60 minutes';
    } else if (newStatus === 'En livraison') {
      estimatedDelivery = '15-30 minutes';
    }
    
    // Prepare data for email template
    const data = {
      customerName: `${user.nom || ''} ${user.prenom || ''}`.trim() || 'Cher client',
      orderId: order._id.toString().slice(-6),
      orderDate: formattedDate,
      statusTracking: generateStatusTracking(newStatus),
      currentStatus: newStatus,
      statusDescription: getStatusDescription(newStatus),
      estimatedDelivery: estimatedDelivery,
      deliveryAddress: order.address,
      items: order.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice.toFixed(2) + ' €',
        total: item.totalPrice.toFixed(2) + ' €'
      })),
      subtotal: order.subtotal.toFixed(2) + ' €',
      deliveryFee: order.deliveryFee.toFixed(2) + ' €',
      total: order.total.toFixed(2) + ' €',
      paymentMethod: order.paymentMethod,
      viewOrderDeepLink
      
    };
    
    // Compile template with data
    const html = template(data);
    
    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"OptiApp" <notification@optiApp.com>',
      to: user.email,
      subject: `OptiApp - Mise à jour de votre commande #${order._id.toString().slice(-6)} - ${newStatus}`,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email notification sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
};



exports.createOrder = async (req, res) => {
  try {
    const { userId, items, address, paymentMethod } = req.body;

    const orderItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({ 
          success: false,
          message: `Produit avec l'ID ${item.productId} non trouvé`
        });
      }
      
      const totalPrice = product.prix * item.quantity;
      subtotal += totalPrice;
      
      orderItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.image,
        quantity: item.quantity,
        unitPrice: product.prix,
        totalPrice: totalPrice,
        opticienId: product.opticienId 
      });
    }
    
    // Vérifiez que le premier produit a un opticienId valide
    if (!orderItems[0] || !orderItems[0].opticienId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'opticien manquant dans les produits'
      });
    }
    
    const opticienId = orderItems[0].opticienId; 
    console.log('Boutique ID:', opticienId); 
    
    const deliveryFee = 10;
    
    const order = new Order({
      userId,
      items: orderItems,
      address,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod,
      opticienId // Assigné une seule fois
    });
    
    const savedOrder = await order.save();
    console.log('Order saved:', savedOrder);
    
    res.status(201).json({
      success: true,
      data: savedOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
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

    // Use populate to fetch the boutique details if boutiqueId is present
    const order = await Order.findById(id).populate({
      path: 'opticienId',
      model: 'Opticien', // Ensure this matches your model name
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la récupération de la commande',
      error: error.message,
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

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Le statut est requis'
      });
    }

    // Trouver la commande
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

    // Si la commande passe à "Completée", mettre à jour le stock des produits
    if (status === 'Completée') {
      // Code existant pour mettre à jour le stock...
    }

    // Get the user associated with this order to send notifications
    const userId = order.userId;
    const user = await User.findById(userId);

    // Envoyer un email de notification à l'utilisateur
    if (user && user.email) {
      await sendOrderStatusEmail(user, updatedOrder, status);
      console.log(`Email de notification envoyé à l'utilisateur ${userId}`);
    }

    // Code existant pour les notifications OneSignal...
    if (user && user.oneSignalPlayerId) {
      // Code existant pour OneSignal...
    }

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: `Commande mise à jour avec succès. Statut: ${status}`
    });
  } catch (error) {
    console.error('Erreur complète:', error);
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
  
    if (user && user.email) {
      await sendOrderStatusEmail(user, order, newStatus);
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
  }