import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Clock,
  FileText,
  HeartPulse,
  Lock,
  ShieldCheck,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { getAppointmentById } from '../services/appointmentService';
import { formatRut } from '../utils/rutValidator';

export const SharedRecordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  // ============================================================
  // CARGAR Y VALIDAR AUTORIZACIÓN
  // ============================================================

  useEffect(() => {
    const loadSharedRecord = async () => {
      try {
        setIsLoading(true);
        setAccessError('');

        const data = await getAppointmentById(token);

        setAppointment(data);
      } catch (error) {
        console.error('Error validando acceso a ficha:', error);

        setAppointment(null);

        setAccessError(
          error.response?.data?.message ||
            'No fue posible validar el acceso a esta ficha.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadSharedRecord();
    }
  }, [token]);

  // ============================================================
  // FORMATO
  // ============================================================

  const formatTime = (date) => {
    if (!date) return '--:--';

    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(date));
  };

  const formatDate = (date) => {
    if (!date) return '';

    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const patientName = appointment
    ? `${appointment.patient_first_name || ''} ${
        appointment.patient_last_name || ''
      }`.trim()
    : '';

  const patientInitials = appointment
    ? `${appointment.patient_first_name?.[0] || 'P'}${
        appointment.patient_last_name?.[0] || ''
      }`.toUpperCase()
    : 'P';

  // ============================================================
  // CARGANDO
  // ============================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Navbar roleTitle="Ficha Clínica Compartida" />

        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-10 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-900 dark:text-teal-300 animate-pulse" />
            </div>

            <h2 className="font-bold text-blue-950 dark:text-slate-100 mt-4">
              Validando autorización
            </h2>

            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              MyMedRecord está comprobando el acceso temporal a la ficha.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // ACCESO RECHAZADO / EXPIRADO
  // ============================================================

  if (accessError) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Navbar roleTitle="Ficha Clínica Compartida" />

        <main className="max-w-3xl mx-auto p-4 sm:p-6">
          <button
            type="button"
            onClick={() => navigate('/doctor')}
            className="mb-4 flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al portal médico
          </button>

          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-3xl p-8 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-200 dark:border-rose-900">
              <Lock className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>

            <h1 className="text-xl font-extrabold text-blue-950 dark:text-slate-100 mt-5">
              Acceso no disponible
            </h1>

            <p className="text-sm text-stone-600 dark:text-slate-400 mt-2">
              {accessError}
            </p>

            <div className="mt-6 p-4 bg-stone-50 dark:bg-slate-800 rounded-2xl text-xs text-stone-500 dark:text-slate-400 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />

              <span>
                La ficha del paciente permanece almacenada en MyMedRecord.
                Solamente ha finalizado o todavía no comienza la autorización
                temporal del profesional.
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/doctor')}
              className="mt-6 px-5 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Volver al portal médico
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // FICHA AUTORIZADA
  // ============================================================

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <Navbar roleTitle="Ficha Clínica Compartida" />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Volver */}
        <button
          type="button"
          onClick={() => navigate('/doctor')}
          className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal médico
        </button>

        {/* Estado del acceso */}
        <div className="bg-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-300" />

                <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">
                  Acceso temporal autorizado
                </span>
              </div>

              <h1 className="text-2xl font-extrabold mt-2">
                Ficha Clínica Compartida
              </h1>

              <p className="text-sm text-blue-100 mt-1">
                Información compartida voluntariamente por el paciente.
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 min-w-52">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Clock className="w-4 h-4 text-teal-300" />
                Acceso activo
              </div>

              <p className="text-xs text-blue-200 mt-1">
                Disponible hasta las{' '}
                <strong className="text-white">
                  {formatTime(appointment.access_expires_at)}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* Datos reales del paciente */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300 font-black text-lg">
                {patientInitials}
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 dark:text-slate-500">
                  Paciente
                </span>

                <h2 className="text-lg font-extrabold text-blue-950 dark:text-slate-100">
                  {patientName || 'Paciente'}
                </h2>

                <p className="text-xs font-mono font-bold text-stone-500 dark:text-slate-400 mt-1">
                  RUT: {formatRut(appointment.patient_rut || '')}
                </p>
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                AUTORIZACIÓN VIGENTE
              </span>
            </div>
          </div>

          {/* Información de autorización */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-stone-200 dark:border-slate-800">
            <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                Fecha
              </span>

              <div className="flex items-center gap-2 mt-1.5">
                <CalendarDays className="w-4 h-4 text-teal-600" />

                <span className="text-xs font-bold capitalize">
                  {formatDate(appointment.scheduled_at)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                Inicio del acceso
              </span>

              <div className="flex items-center gap-2 mt-1.5">
                <Clock className="w-4 h-4 text-teal-600" />

                <span className="text-xs font-bold">
                  {formatTime(appointment.scheduled_at)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                Fin del acceso
              </span>

              <div className="flex items-center gap-2 mt-1.5">
                <Lock className="w-4 h-4 text-teal-600" />

                <span className="text-xs font-bold">
                  {formatTime(appointment.access_expires_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secciones clínicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-950 dark:text-slate-100">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Información clínica
            </div>

            <p className="text-xs text-stone-500 dark:text-slate-400 mt-2">
              Aquí mostraremos antecedentes, medicamentos, signos vitales,
              diagnósticos y resultados estructurados del paciente.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-950 dark:text-slate-100">
              <FileText className="w-4 h-4 text-teal-600" />
              Documentos clínicos
            </div>

            <p className="text-xs text-stone-500 dark:text-slate-400 mt-2">
              Aquí mostraremos recetas, exámenes y documentos que el paciente
              haya incorporado a MyMedRecord.
            </p>
          </div>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 text-[11px] text-stone-400 dark:text-slate-500">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />

          <span>
            El acceso a esta ficha está asociado al profesional autenticado y
            finaliza automáticamente al vencer la autorización temporal.
          </span>
        </div>
      </main>
    </div>
  );
};