const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Route pour créer une nouvelle commande
router.post('/', orderController.createOrder);

// Route pour récupérer toutes les commandes d'un utilisateur
router.get('/user/:userId', orderController.getUserOrders);

// Route pour récupérer une commande spécifique par son ID
router.get('/:id', orderController.getOrderById);

// Route pour mettre à jour le statut d'une commande
router.patch('/:id/status', orderController.updateOrderStatus);

// Route pour annuler une commande
router.delete('/:id', orderController.cancelOrder);

module.exports = router;