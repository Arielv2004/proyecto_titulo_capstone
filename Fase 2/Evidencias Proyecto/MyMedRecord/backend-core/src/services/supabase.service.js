const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');

const SUPABASE_URL = config.SUPABASE?.URL;
const SUPABASE_KEY = config.SUPABASE?.SERVICE_ROLE_KEY;
const BUCKET = config.SUPABASE?.BUCKET || 'medical-documents';

let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('[SupabaseService] Error inicializando cliente de Supabase:', err.message);
  }
}

class SupabaseService {
  /**
   * Extrae el path/nombre de archivo relativo dentro del bucket.
   * Maneja tanto nombres limpios (nuevos) como URLs públicas completas legacy de Supabase.
   * @param {string} filePath
   */
  static objectPath(filePath) {
    if (!filePath || typeof filePath !== 'string') return '';
    let raw = filePath.trim();

    // 1. Si contiene el marcador explícito del bucket (ej: /medical-documents/archivo.png)
    const marker = `/${BUCKET}/`;
    const index = raw.indexOf(marker);
    if (index >= 0) {
      raw = raw.slice(index + marker.length);
    } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
      // 2. Si es cualquier otra URL web, tomar el último segmento de la ruta
      const cleanUrl = raw.split('?')[0].split('#')[0];
      const segments = cleanUrl.split('/');
      raw = segments[segments.length - 1] || '';
    }

    // 3. Limpiar query params, hashes y decodificar caracteres URI
    const cleaned = decodeURIComponent(raw.split('?')[0].split('#')[0]);
    return cleaned;
  }

  static async downloadFile(filePath) {
    if (!this.isConfigured()) {
      const error = new Error('Almacenamiento remoto no disponible.');
      error.statusCode = 503;
      throw error;
    }
    const objectPath = this.objectPath(filePath);
    const { data, error } = await supabaseClient.storage.from(BUCKET).download(objectPath);
    if (error || !data) {
      const missing = new Error('El archivo original no está disponible.');
      missing.statusCode = 404;
      throw missing;
    }
    return Buffer.from(await data.arrayBuffer());
  }
  /**
   * Indica si el servicio de Supabase Storage está configurado y listo.
   */
  static isConfigured() {
    return Boolean(supabaseClient && SUPABASE_URL && SUPABASE_KEY);
  }

  /**
   * Determina si una ruta o nombre corresponde a un archivo almacenado en Supabase Storage.
   * Admite URLs legacy completas o nombres de archivo/rutas relativas dentro del bucket.
   * @param {string} filePath
   */
  static isSupabaseUrl(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    // URLs completas legacy o directas de Supabase
    if (SUPABASE_URL && filePath.startsWith(SUPABASE_URL)) return true;
    if ((filePath.startsWith('http://') || filePath.startsWith('https://')) && filePath.includes('/storage/v1/object/')) {
      return true;
    }
    // Si es un path local absoluto o de la carpeta uploads, no es Supabase
    if (path.isAbsolute(filePath) || filePath.startsWith('uploads') || filePath.startsWith('/uploads')) {
      return false;
    }
    // Si no tiene barras de ruta del sistema de archivos y tiene extensión de archivo, es un identificador de Supabase
    return !filePath.includes(path.sep) && !filePath.includes('/');
  }

  /**
   * Genera una URL firmada de acceso temporal restringido (Signed URL) para un archivo.
   * Por defecto expira en 3600 segundos (1 hora), conforme a la Ley 21.719.
   * @param {string} filePath - Path relativo o URL legacy
   * @param {number} [expiresIn=3600] - Tiempo de validez en segundos
   * @returns {Promise<string|null>}
   */
  static async getSignedUrl(filePath, expiresIn = 3600) {
    if (!this.isConfigured() || !filePath) return null;

    try {
      const cleanPath = this.objectPath(filePath);
      if (!cleanPath) return null;

      const { data, error } = await supabaseClient.storage
        .from(BUCKET)
        .createSignedUrl(cleanPath, expiresIn);

      if (error || !data?.signedUrl) {
        console.warn(`[SupabaseService] No se pudo generar Signed URL para (${cleanPath}):`, error?.message);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      console.warn('[SupabaseService] Error al solicitar Signed URL:', err.message);
      return null;
    }
  }

  /**
   * Sube un buffer a Supabase Storage en el bucket de documentos médicos.
   * Devuelve únicamente el path interno relativo dentro del bucket para proteger la confidencialidad.
   * @param {Buffer} fileBuffer
   * @param {string} originalName
   * @param {string} mimeType
   * @returns {Promise<{ filePath: string, fileName: string }>}
   */
  static async uploadFile(fileBuffer, originalName, mimeType) {
    if (!this.isConfigured()) {
      throw new Error('Supabase Storage no está configurado.');
    }

    const ext = path.extname(originalName || '').toLowerCase() || '.png';
    const random = crypto.randomBytes(8).toString('hex');
    const uniqueName = `${Date.now()}-${random}${ext}`;

    const { data, error } = await supabaseClient.storage
      .from(BUCKET)
      .upload(uniqueName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Error subiendo a Supabase Storage: ${error.message}`);
    }

    // Retornar solo el path relativo interno en el bucket (Ley 21.719 - Confidencialidad)
    return {
      filePath: uniqueName,
      fileName: uniqueName,
    };
  }

  /**
   * Elimina un archivo de Supabase Storage.
   * No lanza error si el archivo no existe (manejo silencioso).
   * @param {string} filePath - URL completa o path relativo dentro del bucket
   */
  static async deleteFile(filePath) {
    if (!this.isConfigured() || !filePath) return false;

    try {
      let relativePath = filePath;
      const bucketMarker = `/${BUCKET}/`;

      if (filePath.includes(bucketMarker)) {
        relativePath = filePath.split(bucketMarker)[1];
      } else if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const parts = filePath.split('/');
        relativePath = parts[parts.length - 1];
      }

      relativePath = decodeURIComponent(relativePath.split('?')[0].split('#')[0]);

      if (!relativePath) return false;

      const { error } = await supabaseClient.storage
        .from(BUCKET)
        .remove([relativePath]);

      if (error) {
        console.warn(`[SupabaseService] Aviso al eliminar archivo (${relativePath}):`, error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] Error no fatal al eliminar archivo:', err.message);
      return false;
    }
  }
}

module.exports = SupabaseService;
