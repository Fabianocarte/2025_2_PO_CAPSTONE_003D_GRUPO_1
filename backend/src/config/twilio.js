const twilio = require('twilio');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Verificar si Twilio está configurado
const twilioConfigured = accountSid && authToken && 
                         accountSid.startsWith('AC') && 
                         authToken.length > 10;

// Cliente de Twilio (solo si está configurado)
const client = twilioConfigured ? twilio(accountSid, authToken) : null;

if (!twilioConfigured) {
    console.warn('⚠️  Twilio no configurado - Las notificaciones WhatsApp estarán deshabilitadas');
    console.warn('   Para habilitar, configura TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env');
}

/**
 * Enviar mensaje de WhatsApp
 * @param {string} to - Número de destino (formato: +56912345678)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<object>} - Respuesta de Twilio
 */
const sendWhatsAppMessage = async (to, message) => {
    if (!client) {
        console.log('📱 [SIMULADO] WhatsApp a', to, ':', message.substring(0, 50) + '...');
        return {
            success: true,
            sid: 'SIMULATED_' + Date.now(),
            status: 'simulated',
            message: 'Twilio no configurado - mensaje simulado'
        };
    }

    try {
        // Asegurar formato correcto
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        
        const response = await client.messages.create({
            from: whatsappNumber,
            to: toNumber,
            body: message
        });
        
        console.log(`✅ WhatsApp enviado a ${to}:`, response.sid);
        return {
            success: true,
            sid: response.sid,
            status: response.status
        };
    } catch (error) {
        console.error('❌ Error al enviar WhatsApp:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Enviar mensaje con imagen
 * @param {string} to - Número de destino
 * @param {string} message - Mensaje
 * @param {string} mediaUrl - URL de la imagen
 */
const sendWhatsAppWithMedia = async (to, message, mediaUrl) => {
    if (!client) {
        console.log('📱 [SIMULADO] WhatsApp con media a', to);
        return {
            success: true,
            sid: 'SIMULATED_' + Date.now(),
            message: 'Twilio no configurado - mensaje simulado'
        };
    }

    try {
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        
        const response = await client.messages.create({
            from: whatsappNumber,
            to: toNumber,
            body: message,
            mediaUrl: [mediaUrl]
        });
        
        console.log(`✅ WhatsApp con media enviado:`, response.sid);
        return {
            success: true,
            sid: response.sid
        };
    } catch (error) {
        console.error('❌ Error al enviar WhatsApp con media:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Validar firma de webhook de Twilio
 * @param {string} signature - Firma X-Twilio-Signature del header
 * @param {string} url - URL completa del webhook
 * @param {object} params - Parámetros del POST
 */
const validateWebhookSignature = (signature, url, params) => {
    if (!client) {
        console.log('⚠️  Validación de webhook simulada (Twilio no configurado)');
        return true; // En desarrollo sin Twilio, permitir requests
    }

    try {
        return twilio.validateRequest(authToken, signature, url, params);
    } catch (error) {
        console.error('❌ Error validando firma Twilio:', error);
        return false;
    }
};

module.exports = {
    client,
    whatsappNumber,
    sendWhatsAppMessage,
    sendWhatsAppWithMedia,
    validateWebhookSignature,
    twilioConfigured
};
