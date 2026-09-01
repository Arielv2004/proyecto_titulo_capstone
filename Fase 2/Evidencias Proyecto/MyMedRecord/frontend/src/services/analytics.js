/**
 * Servicio de Analítica y Telemetría Interna de MyMedRecord
 * Diseñado bajo principios de Privacy by Design y cumplimiento de secreto médico (Ley N° 20.584).
 * Registra eventos de interacción clínica, rendimiento y usabilidad de forma totalmente anónima.
 */

class AnalyticsService {
  constructor() {
    this.sessionId = Math.random().toString(36).substring(2, 15);
    this.events = [];
  }

  /**
   * Registra una vista de página
   */
  trackPageView(pageName) {
    const payload = {
      type: 'PAGE_VIEW',
      page: pageName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      device: window.innerWidth < 640 ? 'MOBILE' : 'DESKTOP',
    };

    this.events.push(payload);
    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics] Vista: ${pageName} (${payload.device})`);
    }
  }

  /**
   * Registra un evento clínico o de interacción del usuario
   */
  trackEvent(category, action, label = null) {
    const payload = {
      type: 'USER_ACTION',
      category, // ej: 'OCR_UPLOAD', 'VITALS_LOG', 'QR_SHARE', 'LOGIN'
      action,   // ej: 'CLICK_CAMERA', 'SUBMIT_FORM', 'REVOKE_ACCESS'
      label,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    this.events.push(payload);
    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics Evento] ${category} -> ${action}`, label ? `(${label})` : '');
    }
  }

  /**
   * Retorna métricas agregadas de la sesión actual
   */
  getSessionMetrics() {
    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      pageViews: this.events.filter((e) => e.type === 'PAGE_VIEW').length,
      userActions: this.events.filter((e) => e.type === 'USER_ACTION').length,
    };
  }
}

export const analytics = new AnalyticsService();
