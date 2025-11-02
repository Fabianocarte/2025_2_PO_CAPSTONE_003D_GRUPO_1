const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

/**
 * @route   POST /api/webhook/whatsapp
 * @desc    Recibir mensajes de WhatsApp desde Twilio
 * @access  Public (validado por Twilio)
 */
router.post('/whatsapp', webhookController.recibirMensajeWhatsApp);

/**
 * @route   GET /api/webhook/whatsapp
 * @desc    Test del webhook
 * @access  Public
 */
router.get('/whatsapp', webhookController.testWebhook);

module.exports = router;
