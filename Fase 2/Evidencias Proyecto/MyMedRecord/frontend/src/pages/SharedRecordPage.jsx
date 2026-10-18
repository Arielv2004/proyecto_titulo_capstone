import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ArrowLeft, Clock, Lock, AlertCircle } from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import api from '../services/api';
import { ClinicalRecord } from '../components/doctor/ClinicalRecord';

export const SharedRecordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [clinicalData, setClinicalData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  // ============================================================
  // CARGAR FICHA COMPARTIDA DIRECTAMENTE CON EL MÉDICO
  // ============================================================

  useEffect(() => {
    const loadDirectSharedRecord = async () => {
      try {
        setIsLoading(true);
        setAccessError('');

        if (!token) {
          throw new Error(
            'No se encontró el token de acceso compartido.'
          );
        }

        const response = await api.get(
          `/access-grants/direct/${encodeURIComponent(token)}`
        );

        if (response.data?.success === false) {
          throw new Error(
            response.data?.message ||
              'No fue posible validar el acceso.'
          );
        }

        const data = response.data?.data;

        if (!data?.grant || !data?.clinicalData) {
          throw new Error(
            'El servidor no devolvió una ficha clínica válida.'
          );
        }

        setClinicalData(data.clinicalData);

        const minutes = Number(
          data.grant.minutesRemaining ?? 0
        );

        setTimeLeft(minutes);
      } catch (error) {
        console.error(
          'Error al abrir ficha compartida:',
          error
        );

        setClinicalData(null);

        setAccessError(
          error.response?.data?.message ||
            error.message ||
            'No fue posible acceder a esta ficha clínica.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDirectSharedRecord();
  }, [token]);

  // ============================================================
  // CUENTA REGRESIVA
  // ============================================================

  useEffect(() => {
    if (
      timeLeft === null ||
      timeLeft === undefined ||
      timeLeft <= 0
    ) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous === null || previous === undefined) {
          return previous;
        }

        if (previous <= 1) {
          clearInterval(interval);

          setClinicalData(null);

          setAccessError(
            'La autorización temporal para consultar esta ficha ha expirado.'
          );

          return 0;
        }

        return previous - 1;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // ============================================================
  // FINALIZAR CONSULTA
  // ============================================================

  const handleFinishConsultation = () => {
    setClinicalData(null);
    navigate('/doctor');
  };

  // ============================================================
  // CARGANDO
  // ============================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-canvas text-body dark:text-ink">
        <Navbar roleTitle="Ficha Clínica Compartida" />

        <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-10 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-teal-700 dark:text-teal-300 animate-pulse" />
            </div>

            <h2 className="font-bold text-ink dark:text-ink mt-4">
              Validando autorización
            </h2>

            <p className="text-xs text-muted dark:text-muted mt-1">
              MyMedRecord está comprobando que tienes
              autorización vigente para consultar esta ficha.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // ERROR / ACCESO EXPIRADO / REVOCADO
  // ============================================================

  if (accessError || !clinicalData) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-canvas text-body dark:text-ink">
        <Navbar roleTitle="Ficha Clínica Compartida" />

        <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto p-4 sm:p-6">
          <button
            type="button"
            onClick={() => navigate('/doctor')}
            className="mb-4 flex items-center gap-2 text-xs font-bold text-muted dark:text-body hover:text-accent-ink dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al portal médico
          </button>

          <div className="bg-surface dark:bg-surface border border-rose-200 dark:border-rose-900 rounded-3xl p-8 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-200 dark:border-rose-900">
              <Lock className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>

            <h1 className="text-xl font-extrabold text-ink dark:text-ink mt-5">
              Acceso no disponible
            </h1>

            <p className="text-sm text-muted dark:text-muted mt-2">
              {accessError ||
                'No fue posible acceder a esta ficha clínica.'}
            </p>

            <div className="mt-6 p-4 bg-canvas dark:bg-surface-muted rounded-2xl text-xs text-muted dark:text-muted flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />

              <span>
                Solo el médico autorizado por el paciente puede
                consultar esta ficha mientras el permiso se
                encuentre vigente.
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/doctor')}
              className="mt-6 px-5 py-3 bg-action hover:bg-action-hover text-on-action rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Volver al portal médico
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // MISMO VISOR CLÍNICO UTILIZADO POR EL ACCESO QR
  // ============================================================

  return <div className="min-h-screen bg-canvas text-body"><Navbar roleTitle="Portal Médico" /><ClinicalRecord data={clinicalData} timeLeft={timeLeft} onFinish={handleFinishConsultation} /></div>;
};
