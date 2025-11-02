const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { verificarToken, verificarTokenSSE } = require('../middleware/auth');

/**
 * @route   GET /api/notifications/stream
 * @desc    Stream de notificaciones en tiempo real (SSE)
 * @access  Private (acepta token por query param)
 */
router.get('/stream', verificarTokenSSE, notificationsController.streamNotifications);

/**
 * @route   GET /api/notifications/stats
 * @desc    Estadísticas de notificaciones
 * @access  Private (Admin)
 */
router.get('/stats', verificarToken, notificationsController.getNotificationStats);

module.exports = router;
