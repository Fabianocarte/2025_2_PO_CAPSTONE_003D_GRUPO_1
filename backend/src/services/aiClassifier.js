const OpenAI = require('openai');

// Verificar si OpenAI está configurado
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiConfigured = openaiApiKey && openaiApiKey.startsWith('sk-');

// Inicializar cliente de OpenAI solo si está configurado
let openai = null;
if (openaiConfigured) {
    openai = new OpenAI({
        apiKey: openaiApiKey
    });
} else {
    console.warn('⚠️  OpenAI no configurado - La clasificación IA estará deshabilitada');
    console.warn('   Se usará clasificación por defecto. Para habilitar IA, configura OPENAI_API_KEY en .env');
}

/**
 * Clasificar solicitud de mantenimiento usando GPT-4
 * @param {string} mensaje - Mensaje del chofer
 * @param {boolean} tieneImagenes - Si incluye fotos
 * @returns {Promise<object>} - Clasificación: {tipo, prioridad, resumen}
 */
const clasificarSolicitud = async (mensaje, tieneImagenes = false) => {
    try {
        const prompt = `
Eres un asistente de clasificación de solicitudes de mantenimiento vehicular para PepsiCo Chile.

Analiza el siguiente mensaje de un chofer y clasifícalo:

MENSAJE: "${mensaje}"
${tieneImagenes ? 'NOTA: El chofer adjuntó fotos.' : ''}

Categorías disponibles:
- mantenimiento_preventivo: Mantenimientos programados (cambio aceite, filtros, revisión km)
- reparacion_urgente: Averías que impiden operar el vehículo
- revision_rutinaria: Chequeos periódicos (frenos, luces, neumáticos)
- falla_mecanica: Problemas en motor, transmisión, suspensión
- falla_electrica: Problemas eléctricos, batería, luces
- accidente: Daños por colisión o siniestro
- neumaticos: Problemas específicos de neumáticos
- otro: Otros casos

Prioridades:
- urgente: Vehículo inmovilizado o riesgo de seguridad
- alta: Requiere atención en las próximas 24-48 horas
- media: Puede programarse en la semana
- baja: Mantenimiento preventivo sin urgencia

Responde SOLO con un JSON válido en este formato exacto:
{
  "tipo": "categoria_seleccionada",
  "prioridad": "nivel_prioridad",
  "resumen": "Descripción breve de 1 línea del problema"
}
`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en clasificación de mantenimiento de flotas. Responde siempre en formato JSON válido.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 300
        });

        const content = response.choices[0].message.content.trim();
        
        // Extraer JSON del contenido (por si viene con markdown)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        
        const clasificacion = JSON.parse(jsonString);

        console.log('✅ Clasificación IA completada:', clasificacion);

        return {
            success: true,
            clasificacion: {
                tipo: clasificacion.tipo || 'otro',
                prioridad: clasificacion.prioridad || 'media',
                resumen: clasificacion.resumen || 'Sin resumen'
            },
            tokens_usados: response.usage.total_tokens
        };

    } catch (error) {
        console.error('❌ Error en clasificación IA:', error.message);
        
        // Clasificación por defecto en caso de error
        return {
            success: false,
            clasificacion: {
                tipo: 'otro',
                prioridad: 'media',
                resumen: 'Clasificación manual requerida'
            },
            error: error.message
        };
    }
};

/**
 * Generar respuesta automática para el chofer
 * @param {object} clasificacion - Resultado de la clasificación
 * @param {number} solicitudId - ID de la solicitud creada
 * @param {number} cantidadImagenes - Cantidad de imágenes adjuntas (opcional)
 */
const generarRespuestaAutomatica = (clasificacion, solicitudId, cantidadImagenes = 0) => {
    const { prioridad, resumen } = clasificacion;
    
    // Texto adicional sobre imágenes
    const imagenesTexto = cantidadImagenes > 0 ? 
        `\n📸 ${cantidadImagenes} foto(s) recibida(s)` : '';
    
    const mensajes = {
        urgente: `🚨 *SOLICITUD URGENTE RECIBIDA* (ID: #${solicitudId})

Tu reporte ha sido clasificado como URGENTE.
${resumen}${imagenesTexto}

Un supervisor revisará tu caso de inmediato. Te notificaremos pronto.

⚠️ Si es una emergencia de seguridad, contacta directamente al supervisor.`,

        alta: `⚡ *Solicitud Recibida* (ID: #${solicitudId})

${resumen}${imagenesTexto}

Prioridad: ALTA
Un supervisor revisará tu solicitud en las próximas horas.

Te mantendremos informado. Gracias!`,

        media: `✅ *Solicitud Registrada* (ID: #${solicitudId})

${resumen}${imagenesTexto}

Tu solicitud será revisada y programada pronto.
Recibirás actualizaciones por este medio.

Gracias por reportar!`,

        baja: `📝 *Solicitud Recibida* (ID: #${solicitudId})

${resumen}${imagenesTexto}

Tu solicitud de mantenimiento ha sido registrada.
Será programada según disponibilidad.

¡Gracias!`
    };

    return mensajes[prioridad] || mensajes.media;
};

/**
 * Detectar si un mensaje es realmente una incidencia o solo conversación
 * @param {string} mensaje - Mensaje del chofer
 * @param {boolean} tieneImagenes - Si incluye fotos
 * @returns {Promise<object>} - { esIncidencia: boolean, razon: string, respuestaSugerida: string }
 */
const esIncidenciaReal = async (mensaje, tieneImagenes = false) => {
    // Si no hay OpenAI configurado, usar lógica simple
    if (!openaiConfigured) {
        return detectarIncidenciaPorPalabrasClaves(mensaje, tieneImagenes);
    }

    try {
        const prompt = `
Eres un filtro inteligente para un sistema de gestión de flotas de PepsiCo Chile.

Tu trabajo es determinar si un mensaje de WhatsApp de un chofer es:
1. Una INCIDENCIA REAL (problema, falla, accidente, mantenimiento necesario)
2. Solo CONVERSACIÓN (saludos, consultas, confirmaciones, mensajes sociales)

MENSAJE: "${mensaje}"
${tieneImagenes ? 'NOTA: El chofer adjuntó fotos (esto sugiere evidencia de un problema real).' : ''}

INCIDENCIAS REALES incluyen:
- Reportes de fallas, averías, problemas mecánicos/eléctricos
- Solicitudes de mantenimiento preventivo o correctivo
- Reportes de accidentes o daños
- Problemas con neumáticos, frenos, motor, etc.
- Cualquier cosa que requiera atención del taller

NO SON INCIDENCIAS (no crear solicitud):
- Saludos ("hola", "buenos días", "¿cómo estás?")
- Consultas generales sin problema específico
- Confirmaciones ("ok", "entendido", "gracias")
- Mensajes de prueba
- Conversación casual
- Agradecimientos

Responde SOLO con un JSON válido:
{
  "esIncidencia": true/false,
  "razon": "Breve explicación de por qué es o no es incidencia",
  "respuestaSugerida": "Mensaje apropiado para enviar al chofer"
}

Si ES incidencia: respuestaSugerida debe indicar que se está procesando.
Si NO ES incidencia: respuestaSugerida debe ser cordial y apropiada al contexto.
`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto filtro de mensajes. Responde siempre en formato JSON válido.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 200
        });

        const content = response.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        const resultado = JSON.parse(jsonString);

        console.log('🔍 Filtro IA:', resultado.esIncidencia ? '✅ ES INCIDENCIA' : '❌ NO ES INCIDENCIA');
        console.log('   Razón:', resultado.razon);

        return resultado;

    } catch (error) {
        console.error('❌ Error en filtro de incidencias:', error.message);
        // En caso de error, usar fallback
        return detectarIncidenciaPorPalabrasClaves(mensaje, tieneImagenes);
    }
};

/**
 * Detección por palabras clave (fallback sin IA)
 */
const detectarIncidenciaPorPalabrasClaves = (mensaje, tieneImagenes) => {
    const textoLower = mensaje.toLowerCase();
    
    // Palabras que NO indican incidencia
    const noIncidencias = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'gracias', 'ok', 'entendido', 'saludos', 'test', 'prueba'];
    const esNoIncidencia = noIncidencias.some(palabra => textoLower === palabra || textoLower === palabra + ' ');
    
    if (esNoIncidencia && !tieneImagenes) {
        return {
            esIncidencia: false,
            razon: 'Mensaje de saludo o conversación general sin problema reportado',
            respuestaSugerida: '👋 ¡Hola! Si tienes algún problema con tu vehículo, descríbelo y adjunta fotos si es posible.'
        };
    }

    // Palabras que SÍ indican incidencia
    const palabrasIncidencia = [
        'problema', 'falla', 'averia', 'roto', 'dañado', 'accidente', 
        'mantenimiento', 'revision', 'cambio', 'aceite', 'freno', 
        'neumatico', 'motor', 'bateria', 'no arranca', 'no funciona',
        'ruido', 'vibra', 'humo', 'luz', 'warning', 'alerta'
    ];
    
    const tieneIndicadorProblema = palabrasIncidencia.some(palabra => textoLower.includes(palabra));
    
    if (tieneIndicadorProblema || tieneImagenes) {
        return {
            esIncidencia: true,
            razon: tieneImagenes ? 'Mensaje con imágenes adjuntas (evidencia)' : 'Contiene palabras clave de problemas',
            respuestaSugerida: '✅ Recibido. Estamos procesando tu reporte...'
        };
    }

    // Si no es claro, ser conservador y NO crear solicitud
    return {
        esIncidencia: false,
        razon: 'No se detectaron indicadores claros de problema',
        respuestaSugerida: '👋 Mensaje recibido. Si necesitas reportar un problema con tu vehículo, describe la situación y adjunta fotos.'
    };
};

module.exports = {
    clasificarSolicitud,
    generarRespuestaAutomatica,
    esIncidenciaReal
};
