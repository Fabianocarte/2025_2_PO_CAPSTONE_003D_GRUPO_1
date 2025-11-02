/**
 * Servicio para gestionar el flujo de ingreso de vehículos al taller
 * Maneja conversaciones guiadas paso a paso con el chofer
 */

const { Conversacion, Vehiculo } = require('../models');

class IngresoFlowManager {
    
    /**
     * Procesar mensaje del chofer según el estado actual del ingreso
     */
    static async procesarMensaje(telefono, mensaje, imagenes = []) {
        // Obtener o crear conversación
        let conversacion = await Conversacion.findOne({ where: { telefono } });
        
        if (!conversacion) {
            conversacion = await Conversacion.create({
                telefono,
                estado: 'activa',
                estado_ingreso: 'inicial',
                datos_ingreso_temp: {},
                ultimo_mensaje: new Date()
            });
        }

        // Actualizar último mensaje
        conversacion.ultimo_mensaje = new Date();
        
        const estadoActual = conversacion.estado_ingreso || 'inicial';
        let respuesta = '';
        let nuevoEstado = estadoActual;
        let datosTemp = conversacion.datos_ingreso_temp || {};

        // Máquina de estados del flujo de ingreso
        switch (estadoActual) {
            case 'inicial':
                // Usuario inicia conversación
                if (this.esIntencionIngreso(mensaje)) {
                    respuesta = this.mensajeBienvenida();
                    nuevoEstado = 'esperando_patente';
                } else {
                    respuesta = this.mensajeAyuda();
                }
                break;

            case 'esperando_patente':
                // Capturar patente
                const patente = this.extraerPatente(mensaje);
                if (patente) {
                    datosTemp.patente = patente;
                    
                    // Verificar si el vehículo existe
                    const vehiculo = await Vehiculo.findOne({ where: { patente } });
                    if (vehiculo) {
                        datosTemp.vehiculo_id = vehiculo.id;
                        datosTemp.marca = vehiculo.marca;
                        datosTemp.modelo = vehiculo.modelo;
                        respuesta = this.mensajeConfirmarVehiculoYProblema(vehiculo);
                    } else {
                        respuesta = this.mensajePatenteNoEncontradaYProblema(patente);
                    }
                    
                    nuevoEstado = 'esperando_problema';
                } else {
                    respuesta = this.mensajeErrorPatente();
                }
                break;

            case 'esperando_problema':
                // Capturar descripción del problema
                const problemaTexto = mensaje.trim();
                
                // Validar que haya descripción
                if (!problemaTexto || problemaTexto.length === 0) {
                    respuesta = `❌ Por favor describe el problema o motivo del ingreso.

No puedo continuar sin una descripción.`;
                    break; // Mantener en el mismo estado
                }
                
                datosTemp.problema = problemaTexto;
                
                // Si envió fotos junto con el problema, guardarlas
                if (imagenes && imagenes.length > 0) {
                    datosTemp.fotos = imagenes;
                } else {
                    datosTemp.fotos = [];
                }
                
                // Ir directo a confirmación
                respuesta = this.mensajeConfirmacionFinal(datosTemp);
                nuevoEstado = 'confirmacion';
                break;

            case 'confirmacion':
                // Usuario confirma o cancela
                if (this.esConfirmacion(mensaje)) {
                    // Validar que tenemos todos los datos necesarios
                    if (!datosTemp.problema || datosTemp.problema.trim().length === 0) {
                        console.error('❌ Error: falta descripción del problema en confirmación');
                        respuesta = '❌ Error interno: falta la descripción del problema. Por favor reinicia el proceso escribiendo "ingreso".';
                        nuevoEstado = 'inicial';
                        datosTemp = {};
                        break;
                    }
                    
                    // Crear la solicitud
                    respuesta = '✅ ¡Perfecto! Creando la solicitud de ingreso...';
                    nuevoEstado = 'completado';
                    
                    // Retornar datos para crear solicitud
                    return {
                        completado: true,
                        datosIngreso: datosTemp,
                        respuesta,
                        conversacion
                    };
                } else if (this.esCancelacion(mensaje)) {
                    respuesta = this.mensajeCancelacion();
                    nuevoEstado = 'inicial';
                    datosTemp = {};
                } else {
                    respuesta = this.mensajeConfirmarOCancelar();
                    break; // Mantener en confirmación
                }
                break;

            case 'completado':
                // Ingreso ya completado, ofrecer nuevo ingreso
                respuesta = this.mensajeNuevoIngreso();
                nuevoEstado = 'inicial';
                datosTemp = {};
                break;

            default:
                respuesta = this.mensajeAyuda();
                nuevoEstado = 'inicial';
        }

        // Actualizar conversación
        conversacion.estado_ingreso = nuevoEstado;
        conversacion.datos_ingreso_temp = datosTemp;
        await conversacion.save();

        return {
            completado: false,
            respuesta,
            estadoActual: nuevoEstado,
            conversacion
        };
    }

    // ==========================================
    // MÉTODOS DE VALIDACIÓN Y EXTRACCIÓN
    // ==========================================

    static esIntencionIngreso(mensaje) {
        const keywords = [
            'ingreso', 'ingresar', 'hola', 'buenos', 'buenas', 
            'inicio', 'iniciar', 'empezar', 'comenzar', 'taller',
            'mantenimiento', 'reparacion', 'problema'
        ];
        const mensajeLower = mensaje.toLowerCase();
        return keywords.some(keyword => mensajeLower.includes(keyword));
    }

    static extraerPatente(mensaje) {
        // Buscar patrón de patente chilena: AA1234, ABCD12, AB1234
        const patrones = [
            /\b([A-Z]{2}\d{4})\b/i,  // AA1234
            /\b([A-Z]{4}\d{2})\b/i,  // ABCD12
            /\b([A-Z]{2}\d{2}\d{2})\b/i // AB1234
        ];
        
        for (const patron of patrones) {
            const match = mensaje.match(patron);
            if (match) {
                return match[1].toUpperCase();
            }
        }
        
        // Si no hay patrón, asumir que el mensaje completo es la patente
        const mensajeLimpio = mensaje.trim().replace(/\s+/g, '').toUpperCase();
        if (mensajeLimpio.length >= 4 && mensajeLimpio.length <= 6) {
            return mensajeLimpio;
        }
        
        return null;
    }

    static extraerKilometraje(mensaje) {
        // Buscar números con o sin separadores
        const match = mensaje.match(/(\d{1,3}(?:[.,]\d{3})*)/);
        if (match) {
            const km = parseInt(match[1].replace(/[.,]/g, ''));
            if (km > 0 && km < 10000000) {
                return km;
            }
        }
        return null;
    }

    static esRespuestaOmitir(mensaje) {
        const keywords = ['no', 'omitir', 'saltar', 'sin fotos', 'sin foto', 'despues', 'después', 'luego', 'skip'];
        const mensajeLower = mensaje.toLowerCase();
        return keywords.some(keyword => mensajeLower.includes(keyword));
    }

    static esConfirmacion(mensaje) {
        const keywords = ['si', 'sí', 'confirmar', 'confirmo', 'ok', 'dale', 'perfecto', 'correcto', 'exacto'];
        const mensajeLower = mensaje.toLowerCase().trim();
        return keywords.some(keyword => mensajeLower === keyword || mensajeLower.startsWith(keyword));
    }

    static esCancelacion(mensaje) {
        const keywords = ['no', 'cancelar', 'cancelo', 'reiniciar', 'reinicio', 'volver'];
        const mensajeLower = mensaje.toLowerCase().trim();
        return keywords.some(keyword => mensajeLower === keyword || mensajeLower.startsWith(keyword));
    }

    // ==========================================
    // PLANTILLAS DE MENSAJES
    // ==========================================

    static mensajeBienvenida() {
        return `🚛 *Bienvenido al Sistema de Ingreso de Taller PepsiCo*

Para registrar el ingreso de tu vehículo, necesito los siguientes datos:

📋 *Paso 1:* Ingresa la *patente* del vehículo
Ejemplo: AA1234`;
    }

    static mensajeAyuda() {
        return `👋 ¡Hola! Soy el asistente de ingreso al taller.

Para iniciar el ingreso de un vehículo, envíame:
• "Ingreso"
• "Hola" 
• "Iniciar"

¿En qué puedo ayudarte?`;
    }

    static mensajeConfirmarVehiculoYProblema(vehiculo) {
        return `✅ *Vehículo encontrado:*
🚛 Patente: ${vehiculo.patente}
📌 Marca: ${vehiculo.marca}
📌 Modelo: ${vehiculo.modelo}

📋 *Paso 2:* Describe el *problema* o motivo del ingreso.

Puedes ser tan detallado como necesites y si deseas, enviar fotos 📸 junto con la descripción.`;
    }

    static mensajePatenteNoEncontradaYProblema(patente) {
        return `⚠️ La patente *${patente}* no está registrada en el sistema, pero continuaremos con el ingreso.

📋 *Paso 2:* Describe el *problema* o motivo del ingreso.

Puedes ser tan detallado como necesites y si deseas, enviar fotos 📸 junto con la descripción.`;
    }

    static mensajeErrorPatente() {
        return `❌ No pude identificar la patente.

Por favor envía solo la patente del vehículo.
Ejemplo: *AA1234* o *ABCD12*`;
    }

    static mensajeConfirmacionFinal(datos) {
        return `📋 *Resumen del Ingreso:*

🚛 Patente: ${datos.patente}
${datos.marca ? `📌 Vehículo: ${datos.marca} ${datos.modelo}\n` : ''}❗ Problema: ${datos.problema}
📸 Fotos: ${datos.fotos?.length || 0}

¿Confirmas esta información?
• Escribe *"sí"* para confirmar
• Escribe *"no"* para cancelar`;
    }

    static mensajeConfirmarOCancelar() {
        return `Por favor confirma:
• Escribe *"sí"* para crear la solicitud
• Escribe *"no"* para cancelar`;
    }

    static mensajeCancelacion() {
        return `❌ Ingreso cancelado.

Para iniciar un nuevo ingreso, escribe "ingreso".`;
    }

    static mensajeNuevoIngreso() {
        return `✅ El ingreso anterior fue completado.

¿Deseas hacer un nuevo ingreso?
Escribe "ingreso" para comenzar.`;
    }
}

module.exports = IngresoFlowManager;
