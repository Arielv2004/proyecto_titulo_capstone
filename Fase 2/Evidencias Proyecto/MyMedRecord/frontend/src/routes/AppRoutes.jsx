import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { PatientDashboard } from '../pages/PatientDashboard';
import { DoctorQrAccessPage } from '../pages/DoctorQrAccessPage';
import { PrivacyPolicyPage } from '../pages/PrivacyPolicyPage';
import { TermsPage } from '../pages/TermsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { analytics } from '../services/analytics';

export const AppRoutes = () => {
  const { checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Telemetría de vistas de página
  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/doctor/qr-access" element={<DoctorQrAccessPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Rutas Protegidas Paciente */}
      <Route element={<ProtectedRoute allowedRoles={['PACIENTE']} />}>
        <Route path="/patient" element={<PatientDashboard />} />
      </Route>

      {/* Redirección de Rutas Médicas hacia el Portal QR Oficial */}
      <Route path="/doctor" element={<Navigate to="/doctor/qr-access" replace />} />
      <Route path="/admin" element={<Navigate to="/doctor/qr-access" replace />} />

      {/* Ruta 404 Personalizada */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
