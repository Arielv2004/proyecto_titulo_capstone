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
   * Indica si el servicio de Supabase Storage está configurado y listo.
   */
  static isConfigured() {
    return Boolean(supabaseClient && SUPABASE_URL && SUPABASE_KEY);
  }

  /**
   * Determina si una ruta corresponde a una URL almacenada en Supabase Storage.
   * @param {string} filePath
   */
  static isSupabaseUrl(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    if (SUPABASE_URL && filePath.startsWith(SUPABASE_URL)) return true;
    return (
      (filePath.startsWith('http://') || filePath.startsWith('https://')) &&
      filePath.includes('/storage/v1/object/')
    );
  }

  /**
   * Sube un buffer a Supabase Storage en el bucket de documentos médicos.
   * @param {Buffer} fileBuffer
   * @param {string} originalName
   * @param {string} mimeType
   * @returns {Promise<{ publicUrl: string, fileName: string }>}
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

    // Construir URL pública según especificación
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uniqueName}`;

    return {
      publicUrl,
      fileName: uniqueName,
    };
  }

  /**
   * Elimina un archivo de Supabase Storage.
   * No lanza error si el archivo no existe (manejo silencioso).
   * @param {string} filePath - URL completa o path relativo dentro del bucket
   */
  static async deleteFile(filePath) {
    if (!this.isConfigured() || !filePath) return;

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

      if (!relativePath) return;

      const { error } = await supabaseClient.storage
        .from(BUCKET)
        .remove([relativePath]);

      if (error) {
        console.warn(`[SupabaseService] Aviso al eliminar archivo (${relativePath}):`, error.message);
      }
    } catch (err) {
      console.warn('[SupabaseService] Error no fatal al eliminar archivo:', err.message);
    }
  }
}

module.exports = SupabaseService;
