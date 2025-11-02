/**
 * ImageManager - Gestión de imágenes de WhatsApp
 * Descarga, almacena y actualiza imágenes de solicitudes
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ImageManager {
    
    /**
     * Descargar imagen de Twilio y guardarla localmente
     * @param {string} mediaUrl - URL de la imagen en Twilio
     * @returns {object|null} Información de la imagen guardada o null si falla
     */
    static async descargarImagen(mediaUrl) {
        try {
            console.log(`📥 Descargando imagen: ${mediaUrl.substring(0, 50)}...`);
            
            const twilioSid = process.env.TWILIO_ACCOUNT_SID;
            const twilioToken = process.env.TWILIO_AUTH_TOKEN;
            
            if (!twilioSid || !twilioToken) {
                console.error('❌ Credenciales de Twilio no configuradas');
                return null;
            }
            
            console.log(`🔐 Autenticando con Twilio SID: ${twilioSid.substring(0, 10)}...`);
            
            // Descargar imagen con autenticación de Twilio
            const response = await axios.get(mediaUrl, {
                auth: {
                    username: twilioSid,
                    password: twilioToken
                },
                responseType: 'arraybuffer',
                timeout: 10000 // 10 segundos timeout
            });
            
            // Determinar extensión del archivo
            const contentType = response.headers['content-type'];
            let extension = 'jpg';
            if (contentType) {
                if (contentType.includes('png')) extension = 'png';
                else if (contentType.includes('jpeg')) extension = 'jpg';
                else if (contentType.includes('jpg')) extension = 'jpg';
                else if (contentType.includes('gif')) extension = 'gif';
            }
            
            // Generar nombre único
            const filename = `${crypto.randomBytes(16).toString('hex')}_${Date.now()}.${extension}`;
            const uploadsDir = path.join(__dirname, '../../uploads');
            const filepath = path.join(uploadsDir, filename);
            
            // Crear directorio si no existe
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Guardar archivo
            fs.writeFileSync(filepath, response.data);
            
            const sizeKB = (response.data.length / 1024).toFixed(2);
            console.log(`✅ Imagen guardada: ${filename} (${sizeKB} KB)`);
            
            return {
                filename,
                url: `/uploads/${filename}`,
                size: response.data.length,
                contentType: contentType || 'image/jpeg'
            };
            
        } catch (error) {
            console.error('❌ Error descargando imagen:', error.message);
            console.error('❌ URL que falló:', mediaUrl);
            if (error.response) {
                console.error('❌ Status:', error.response.status);
                console.error('❌ Status Text:', error.response.statusText);
            }
            return null;
        }
    }
    
    /**
     * Descargar múltiples imágenes en paralelo
     * @param {array} mediaUrls - Array de URLs de imágenes
     * @returns {array} Array de objetos de imágenes descargadas (sin nulls)
     */
    static async descargarImagenes(mediaUrls) {
        console.log(`📸 Descargando ${mediaUrls.length} imagen(es)...`);
        
        const promesas = mediaUrls.map(url => this.descargarImagen(url));
        const resultados = await Promise.all(promesas);
        
        // Filtrar nulls (imágenes que fallaron)
        const exitosas = resultados.filter(r => r !== null);
        
        console.log(`✅ ${exitosas.length}/${mediaUrls.length} imágenes descargadas exitosamente`);
        
        return exitosas;
    }
    
    /**
     * Actualizar imágenes de una solicitud existente
     * @param {number} solicitudId - ID de la solicitud
     * @param {array} nuevasImagenes - Array de URLs de nuevas imágenes
     * @returns {object|null} Solicitud actualizada o null si no existe
     */
    static async actualizarImagenesSolicitud(solicitudId, nuevasImagenes) {
        const { Solicitud } = require('../models');
        
        try {
            const solicitud = await Solicitud.findByPk(solicitudId);
            if (!solicitud) {
                console.error(`❌ Solicitud #${solicitudId} no encontrada`);
                return null;
            }
            
            // Obtener imágenes actuales
            const imagenesActuales = solicitud.imagenes || [];
            const imagenesActualizadas = [...imagenesActuales, ...nuevasImagenes];
            
            // Actualizar solicitud
            await solicitud.update({
                imagenes: imagenesActualizadas
            });
            
            console.log(`✅ Solicitud #${solicitudId} actualizada: ${imagenesActuales.length} → ${imagenesActualizadas.length} imágenes`);
            
            return solicitud;
            
        } catch (error) {
            console.error(`❌ Error actualizando solicitud #${solicitudId}:`, error.message);
            return null;
        }
    }
    
    /**
     * Validar tipo de archivo de imagen
     * @param {string} contentType - Content-Type del archivo
     * @returns {boolean} true si es un tipo válido
     */
    static esImagenValida(contentType) {
        const tiposValidos = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif'
        ];
        return tiposValidos.includes(contentType);
    }
    
    /**
     * Eliminar imagen del servidor
     * @param {string} filename - Nombre del archivo a eliminar
     * @returns {boolean} true si se eliminó exitosamente
     */
    static eliminarImagen(filename) {
        try {
            const filepath = path.join(__dirname, '../../uploads', filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`🗑️ Imagen eliminada: ${filename}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ Error eliminando imagen ${filename}:`, error.message);
            return false;
        }
    }
    
    /**
     * Obtener tamaño total de uploads
     * @returns {object} Estadísticas del directorio uploads
     */
    static obtenerEstadisticas() {
        try {
            const uploadsDir = path.join(__dirname, '../../uploads');
            
            if (!fs.existsSync(uploadsDir)) {
                return { total_archivos: 0, tamaño_total_mb: 0 };
            }
            
            const archivos = fs.readdirSync(uploadsDir);
            let tamañoTotal = 0;
            
            archivos.forEach(archivo => {
                const stats = fs.statSync(path.join(uploadsDir, archivo));
                tamañoTotal += stats.size;
            });
            
            return {
                total_archivos: archivos.length,
                tamaño_total_mb: (tamañoTotal / (1024 * 1024)).toFixed(2)
            };
            
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error.message);
            return { total_archivos: 0, tamaño_total_mb: 0 };
        }
    }
}

module.exports = ImageManager;
