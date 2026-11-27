
import api from './api';

export const userApi = {
  /**
   * Descarga el archivo JSON con toda la información clínica y de perfil
   * (Ley 21.719 - Portabilidad)
   */
  exportMyData: async () => {
    const response = await api.get('/users/me/export', {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Intentar extraer el filename del header o generar uno por defecto
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `mymedrecord-export-${today}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  },

  /**
   * Genera y descarga el Informe Clínico Unificado en PDF
   * enriquecido con IA.
   */
  downloadClinicalReport: async () => {
    const response = await api.get('/users/me/clinical-report', {
      responseType: 'blob',
      timeout: 45000,
    });

    const blob = new Blob([response.data], {
      type: 'application/pdf',
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `informe-clinico-mymedrecord-${today}.pdf`;

    const { Capacitor } = await import('@capacitor/core');

    // Descarga para Android
    if (Capacitor.getPlatform() === 'android') {
      const { Filesystem, Directory } = await import(
        '@capacitor/filesystem'
      );

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(String(reader.result).split(',')[1]);
        };

        reader.onerror = () => {
          reject(new Error('No se pudo preparar el PDF.'));
        };

        reader.readAsDataURL(blob);
      });

      // Guardar el PDF en Documents
      const saved = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      return {
        saved: true,
        android: true,
        filename,
        uri: saved.uri,
      };
    }

    // Descarga normal para PC
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    return {
      saved: true,
      android: false,
      filename,
    };
  },

  /**
   * Compartir el informe PDF guardado en Android.
   */
  shareClinicalReport: async (uri) => {
    if (!uri) {
      throw new Error('No hay un PDF guardado para compartir.');
    }

    const { Share } = await import('@capacitor/share');

    await Share.share({
      title: 'Informe clínico MyMedRecord',
      text: 'Informe clínico en PDF',
      url: uri,
      dialogTitle: 'Compartir informe clínico',
    });
  },

  /**
   * Elimina la cuenta y todos los datos asociados de forma definitiva
   * (Ley 21.719 - Cancelación / Olvido)
   */
  deleteMyAccount: async ({ confirmation, password }) => {
    const response = await api.delete('/users/me', {
      data: { confirmation, password },
    });

    return response.data;
  },
};
