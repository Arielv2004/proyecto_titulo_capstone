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

