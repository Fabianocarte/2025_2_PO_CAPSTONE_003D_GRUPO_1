const { Solicitud, Usuario, Vehiculo, Conversacion, HistorialMensaje } = require('../models');
const { clasificarSolicitud } = require('../services/aiClassifier');
const { sendWhatsAppMessage } = require('../config/twilio');
const ImageManager = require('../services/imageManager');
const NotificationManager = require('../services/notificationManager');
const IngresoFlowManager = require('../services/ingresoFlowManager');

/**
 * Webhook para recibir mensajes de WhatsApp desde Twilio
 * NUEVO FLUJO: Ingreso guiado de veh�culos al taller
 */
const recibirMensajeWhatsApp = async (req, res) => {
    try {
        console.log(' Mensaje de WhatsApp recibido:', req.body);

        // Extraer datos del webhook de Twilio
        const {
            From: telefonoOrigen,
            Body: mensaje,
            NumMedia: cantidadMedias,
            MediaUrl0,
            MediaUrl1,
            MediaUrl2
        } = req.body;

        // Limpiar n�mero de tel�fono (remover 'whatsapp:')
        const telefono = telefonoOrigen.replace('whatsapp:', '');
        const cantidadMediasNum = parseInt(cantidadMedias) || 0;
        
        // Recopilar URLs de im�genes de Twilio
        const mediaUrls = [];
        if (cantidadMediasNum > 0) {
            if (MediaUrl0) mediaUrls.push(MediaUrl0);
            if (MediaUrl1) mediaUrls.push(MediaUrl1);
            if (MediaUrl2) mediaUrls.push(MediaUrl2);
        }

        console.log(` Recibido de ${telefono}: Texto=${!!mensaje}, Medias=${mediaUrls.length}`);

        // Descargar im�genes si las hay
        let imagenesLocales = [];
        if (mediaUrls.length > 0) {
            console.log(' Descargando im�genes...');
            const imagenesDescargadas = await ImageManager.descargarImagenes(mediaUrls);
            imagenesLocales = imagenesDescargadas.map(img => img.url);
            console.log(` ${imagenesLocales.length} imagen(es) descargadas`);
        }

        // ==========================================
        // FLUJO GUIADO DE INGRESO
        // ==========================================
        const resultado = await IngresoFlowManager.procesarMensaje(
            telefono, 
            mensaje || '', 
            imagenesLocales
        );

        console.log(` Estado flujo: ${resultado.estadoActual || 'completado'}`);

        // Si el flujo se complet�, crear la solicitud
        if (resultado.completado) {
            const datosIngreso = resultado.datosIngreso;
            
            console.log(' Flujo de ingreso completado, creando solicitud...');

            // Buscar chofer por tel�fono
            let chofer = await Usuario.findOne({
                where: { telefono, rol: 'chofer' }
            });

            // Crear solicitud
            const nuevaSolicitud = await Solicitud.create({
                chofer_id: chofer?.id || null,
                vehiculo_id: datosIngreso.vehiculo_id || null,
                telefono_origen: telefono,
                descripcion: datosIngreso.problema,
                mensaje_original: datosIngreso.problema,
                tipo: 'ingreso_taller',
                prioridad: 'media',
                estado: 'pendiente',
                imagenes: datosIngreso.fotos || [],
                fecha_hora: new Date()
            });

            console.log(` Solicitud #${nuevaSolicitud.id} creada`);

            // Actualizar conversaci�n
            await resultado.conversacion.update({
                tiene_solicitud_activa: true,
                solicitud_activa_id: nuevaSolicitud.id,
                estado_ingreso: 'inicial',
                datos_ingreso_temp: null
            });

            // Clasificar con IA (opcional, en segundo plano)
            try {
                const clasificacion = await clasificarSolicitud(datosIngreso.problema, datosIngreso.fotos?.length > 0);
                if (clasificacion.success) {
                    await nuevaSolicitud.update({
                        tipo: clasificacion.clasificacion.tipo,
                        prioridad: clasificacion.clasificacion.prioridad,
                        clasificacion_ia: clasificacion.clasificacion
                    });
                    console.log(` Solicitud #${nuevaSolicitud.id} clasificada: ${clasificacion.clasificacion.tipo} / ${clasificacion.clasificacion.prioridad}`);
                }
            } catch (error) {
                console.error('Error en clasificaci�n IA:', error.message);
            }

            // Respuesta final al chofer
            const respuestaFinal = `✅ *¡Ingreso registrado exitosamente!*

📋 Solicitud: #${nuevaSolicitud.id}
🚛 Patente: ${datosIngreso.patente}
📸 Evidencias: ${datosIngreso.fotos?.length || 0} foto(s)

Tu solicitud será revisada por un supervisor y recibirás notificaciones del progreso.

¡Gracias! 👍`;

            await sendWhatsAppMessage(telefono, respuestaFinal);

            // Notificar a supervisores
            await NotificationManager.notificarNuevaSolicitud(nuevaSolicitud, { 
                Solicitud, 
                Usuario, 
                Vehiculo 
            });

            console.log(' Notificaciones enviadas');

        } else {
            // Enviar respuesta del flujo
            await sendWhatsAppMessage(telefono, resultado.respuesta);
            console.log(` Respuesta enviada: ${resultado.respuesta.substring(0, 50)}...`);
        }

        // Registrar en historial
        await HistorialMensaje.create({
            conversacion_id: resultado.conversacion.id,
            telefono,
            tipo: 'entrante',
            mensaje: mensaje || '[Imagen sin texto]',
            tiene_imagenes: imagenesLocales.length > 0,
            numero_imagenes: imagenesLocales.length,
            fue_incidencia: resultado.completado
        });

        return res.status(200).send('OK');

    } catch (error) {
        console.error(' Error en webhook:', error);
        
        try {
            const telefono = req.body.From?.replace('whatsapp:', '');
            if (telefono) {
                await sendWhatsAppMessage(
                    telefono,
                    ' Lo siento, hubo un error procesando tu mensaje. Por favor intenta nuevamente.'
                );
            }
        } catch (sendError) {
            console.error('Error enviando mensaje de error:', sendError);
        }
        
        return res.status(500).send('Error interno del servidor');
    }
};

/**
 * Endpoint de prueba del webhook
 */
const testWebhook = (req, res) => {
    res.json({
        message: 'Webhook de WhatsApp funcionando',
        timestamp: new Date().toISOString(),
        method: req.method
    });
};

module.exports = {
    recibirMensajeWhatsApp,
    testWebhook
};
