import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { PatientDashboard } from '../pages/PatientDashboard';
import { DoctorDashboard } from '../pages/DoctorDashboard';
import { SharedRecordPage } from '../pages/SharedRecordPage';
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
      {/* ========================= */}
      {/* RUTAS PÚBLICAS */}
      {/* ========================= */}

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        path="/privacy"
        element={<PrivacyPolicyPage />}
      />

      <Route
        path="/terms"
        element={<TermsPage />}
      />

      {/* ========================= */}
      {/* RUTAS DEL PACIENTE */}
      {/* ========================= */}

      <Route
        element={
          <ProtectedRoute allowedRoles={['PACIENTE']} />
        }
      >
        <Route
          path="/patient"
          element={<PatientDashboard />}
        />
      </Route>

      {/* ========================= */}
      {/* RUTAS DEL MÉDICO */}
      {/* ========================= */}

      <Route
        element={
          <ProtectedRoute allowedRoles={['MEDICO']} />
        }
      >
        {/* Portal principal del médico */}
        <Route
          path="/doctor"
          element={<DoctorDashboard />}
        />

        {/* Ficha clínica compartida */}
        <Route
          path="/shared-record/:token"
          element={<SharedRecordPage />}
        />

        {/* Compatibilidad con antigua ruta admin */}
        <Route
          path="/admin"
          element={<Navigate to="/doctor" replace />}
        />
      </Route>

      {/* ========================= */}
      {/* RUTA 404 */}
      {/* ========================= */}

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
};