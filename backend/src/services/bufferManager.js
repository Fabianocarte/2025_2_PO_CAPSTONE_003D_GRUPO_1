/**
 * BufferManager - Gestión de buffer temporal para mensajes WhatsApp
 * Permite esperar imágenes adicionales antes de procesar una solicitud
 */

const NodeCache = require('node-cache');

// Cache en memoria: key = telefono, value = { mensaje, imagenes, timer }
const bufferCache = new NodeCache({ 
    stdTTL: 20, // 20 segundos tiempo de vida
    checkperiod: 2 // Verificar cada 2 segundos
});

const BUFFER_TIMEOUT = 10000; // 10 segundos de espera

class BufferManager {
    
    /**
     * Agregar mensaje con texto al buffer
     * @param {string} telefono - Número de teléfono del remitente
     * @param {object} datos - Datos del mensaje (mensaje, imagenes, vehiculoId, choferId)
     * @returns {object} Datos del buffer creado
     */
    static agregarMensaje(telefono, datos) {
        const key = telefono;
        
        const bufferData = {
            telefono,
            mensaje: datos.mensaje,
            imagenes: datos.imagenes || [],
            timestamp: Date.now(),
            procesado: false,
            vehiculoId: datos.vehiculoId || null,
            choferId: datos.choferId || null
        };
        
        bufferCache.set(key, bufferData);
        
        console.log(`📦 Buffer creado para ${telefono}:`, {
            mensaje_length: datos.mensaje.length,
            imagenes_inmediatas: bufferData.imagenes.length,
            timeout: BUFFER_TIMEOUT
        });
        
        return bufferData;
    }
    
    /**
     * Agregar imágenes a buffer existente
     * @param {string} telefono - Número de teléfono
     * @param {array} imagenes - URLs de imágenes a agregar
     * @returns {object} Resultado con existente (bool) y datos
     */
    static agregarImagenes(telefono, imagenes) {
        const key = telefono;
        const existing = bufferCache.get(key);
        
        if (existing && !existing.procesado) {
            // Agregar a buffer existente
            existing.imagenes = [...existing.imagenes, ...imagenes];
            bufferCache.set(key, existing);
            
            console.log(`📸 ${imagenes.length} imagen(es) agregadas al buffer de ${telefono}. Total: ${existing.imagenes.length}`);
            
            return { existente: true, buffer: existing };
        }
        
        // No hay buffer activo, son imágenes huérfanas
        console.log(`⚠️ Imágenes huérfanas recibidas de ${telefono} (sin buffer activo)`);
        return { existente: false, imagenes };
    }
    
    /**
     * Obtener buffer por teléfono
     * @param {string} telefono - Número de teléfono
     * @returns {object|undefined} Datos del buffer o undefined
     */
    static obtenerBuffer(telefono) {
        return bufferCache.get(telefono);
    }
    
    /**
     * Marcar buffer como procesado (evita doble procesamiento)
     * @param {string} telefono - Número de teléfono
     */
    static marcarProcesado(telefono) {
        const buffer = bufferCache.get(telefono);
        if (buffer) {
            buffer.procesado = true;
            bufferCache.set(telefono, buffer);
            console.log(`✅ Buffer marcado como procesado: ${telefono}`);
        }
    }
    
    /**
     * Eliminar buffer del cache
     * @param {string} telefono - Número de teléfono
     */
    static eliminarBuffer(telefono) {
        bufferCache.del(telefono);
        console.log(`🗑️ Buffer eliminado: ${telefono}`);
    }
    
    /**
     * Programar procesamiento con timeout
     * @param {string} telefono - Número de teléfono
     * @param {function} callback - Función a ejecutar cuando expire el timeout
     */
    static programarProcesamiento(telefono, callback) {
        setTimeout(() => {
            const buffer = bufferCache.get(telefono);
            if (buffer && !buffer.procesado) {
                console.log(`⏱️ Timeout expirado para ${telefono}. Procesando solicitud...`);
                callback(buffer);
            } else if (buffer && buffer.procesado) {
                console.log(`⏭️ Buffer ya procesado para ${telefono}. Ignorando timeout.`);
            }
        }, BUFFER_TIMEOUT);
    }
    
    /**
     * Obtener estadísticas del cache
     * @returns {object} Estadísticas del cache
     */
    static obtenerEstadisticas() {
        const keys = bufferCache.keys();
        const buffers = keys.map(k => bufferCache.get(k));
        
        return {
            total_buffers_activos: keys.length,
            buffers_procesados: buffers.filter(b => b.procesado).length,
            buffers_pendientes: buffers.filter(b => !b.procesado).length,
            timeout_ms: BUFFER_TIMEOUT
        };
    }
}

module.exports = BufferManager;
