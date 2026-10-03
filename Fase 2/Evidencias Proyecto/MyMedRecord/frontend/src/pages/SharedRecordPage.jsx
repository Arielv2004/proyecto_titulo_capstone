import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Clock,
  FileText,
  Phone,
  HeartPulse,
  Lock,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Printer,
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import api from '../services/api';

export const SharedRecordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [grantInfo, setGrantInfo] = useState(null);
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

        setGrantInfo(data.grant);
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

        setGrantInfo(null);
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
          setGrantInfo(null);

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
    setGrantInfo(null);
    navigate('/doctor');
  };

  // ============================================================
  // CARGANDO
  // ============================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Navbar roleTitle="Ficha Clínica Compartida" />

        <main className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-10 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-teal-700 dark:text-teal-300 animate-pulse" />
            </div>

            <h2 className="font-bold text-blue-950 dark:text-slate-100 mt-4">
              Validando autorización
            </h2>

            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
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
              {accessError ||
                'No fue posible acceder a esta ficha clínica.'}
            </p>

            <div className="mt-6 p-4 bg-stone-50 dark:bg-slate-800 rounded-2xl text-xs text-stone-500 dark:text-slate-400 flex items-start gap-2 text-left">
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
  // MISMO VISOR CLÍNICO UTILIZADO POR EL ACCESO QR
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar roleTitle="Ficha Clínica Compartida" />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 my-4 animate-in fade-in duration-200">

        {/* VOLVER */}

        <button
          type="button"
          onClick={() => navigate('/doctor')}
          className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-teal-300 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al portal médico
        </button>

        {/* ===================================================== */}
        {/* CINTILLO DE SEGURIDAD */}
        {/* ===================================================== */}

        <div className="p-4 bg-teal-900 text-white rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-teal-300 animate-pulse" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-teal-200 block">
                Acceso Clínico Temporal Autorizado
              </span>

              <span className="text-sm font-bold block">
                Vigente por{' '}
                {timeLeft > 60
                  ? `${Math.floor(timeLeft / 60)}h ${
                      timeLeft % 60
                    }m`
                  : `${timeLeft || 0} minutos restantes`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Ficha Clínica</span>
            </button>

            <button
              type="button"
              onClick={handleFinishConsultation}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Finalizar Consulta
            </button>
          </div>
        </div>

        {/* ===================================================== */}
        {/* FICHA RESUMEN DEL PACIENTE */}
        {/* ===================================================== */}

        <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/80 dark:border-slate-800 gap-3">

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-teal-300 font-black text-xl flex items-center justify-center">

                {clinicalData.patient?.firstName?.[0] || 'P'}
                {clinicalData.patient?.lastName?.[0] || ''}

              </div>

              <div>
                <h2 className="text-xl font-black text-blue-950 dark:text-slate-100">
                  {clinicalData.patient?.firstName || ''}{' '}
                  {clinicalData.patient?.lastName || ''}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-slate-400 mt-1">

                  <span className="font-mono font-bold text-blue-900 dark:text-teal-300">
                    RUT:{' '}
                    {clinicalData.patient?.rut ||
                      'Sin registrar'}
                  </span>

                  <span>•</span>

                  <span>
                    Previsión:{' '}
                    {clinicalData.profile?.healthInsurance ||
                      'FONASA'}
                  </span>

                  <span>•</span>

                  <span>
                    Donante:{' '}
                    {clinicalData.profile?.isOrganDonor
                      ? 'Sí (Ley 20.413)'
                      : 'No'}
                  </span>

                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-1.5">
                Grupo:{' '}
                {clinicalData.profile?.bloodType ||
                  'Sin Registrar'}
              </span>
            </div>
          </div>

          {/* ================================================= */}
          {/* ALERTAS CRÍTICAS */}
          {/* ================================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ALERGIAS */}

            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">

              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Alergias Conocidas (Crítico)
              </span>

              {clinicalData.profile?.allergies &&
              clinicalData.profile.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">

                  {clinicalData.profile.allergies.map(
                    (allergy, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold"
                      >
                        {allergy}
                      </span>
                    )
                  )}

                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Sin alergias declaradas.
                </p>
              )}
            </div>

            {/* ENFERMEDADES CRÓNICAS */}

            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2">

              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">

                <HeartPulse className="w-4 h-4 text-amber-600 dark:text-amber-400" />

                Enfermedades Crónicas / Diagnósticos Base

              </span>

              {clinicalData.profile?.chronicConditions &&
              clinicalData.profile.chronicConditions.length >
                0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">

                  {clinicalData.profile.chronicConditions.map(
                    (condition, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-bold"
                      >
                        {condition}
                      </span>
                    )
                  )}

                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Sin patologías crónicas reportadas.
                </p>
              )}
            </div>
          </div>

          {/* ================================================= */}
          {/* RECETAS Y TRATAMIENTOS */}
          {/* ================================================= */}

          <div className="space-y-3">

            <h3 className="text-sm font-extrabold text-blue-950 dark:text-slate-100 flex items-center gap-2">

              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />

              <span>
                Tratamientos y Recetas Médicas Activas (
                {clinicalData.prescriptions?.length || 0})
              </span>

            </h3>

            {clinicalData.prescriptions &&
            clinicalData.prescriptions.length > 0 ? (

              <div className="space-y-3">

                {clinicalData.prescriptions.map((rx) => (

                  <div
                    key={rx.id}
                    className="p-4 bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-800 rounded-2xl space-y-2"
                  >

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-700/80 pb-2">

                      <div>

                        <span className="text-xs font-bold text-blue-950 dark:text-slate-100 block">

                          {rx.diagnosis_text ||
                            'Tratamiento médico'}{' '}

                          {rx.diagnosis_code
                            ? `(${rx.diagnosis_code})`
                            : ''}

                        </span>

                        <span className="text-[11px] text-stone-400 dark:text-slate-500">

                          Emisor:{' '}
                          {rx.doctor_name ||
                            'Médico Tratante'}{' '}
                          · Fecha:{' '}
                          {rx.issue_date || 'Reciente'}

                        </span>

                      </div>

                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[11px] font-bold self-start">

                        Vigente hasta{' '}
                        {rx.valid_until ||
                          'Próximo control'}

                      </span>

                    </div>

                    <div className="space-y-1.5 pt-1">

                      {rx.items?.map((item, index) => (

                        <div
                          key={item.id || index}
                          className="text-xs flex items-start gap-2"
                        >

                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />

                          <div>

                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.medication_name ||
                                'Medicamento'}
                            </strong>

                            {item.dosage && (
                              <>
                                {' '}
                                - {item.dosage}
                              </>
                            )}

                            {item.frequency && (
                              <> ({item.frequency})</>
                            )}

                            {item.instructions && (

                              <p className="text-[11px] text-stone-500 dark:text-slate-400 italic mt-0.5">

                                Indicación:{' '}
                                {item.instructions}

                              </p>

                            )}

                          </div>
                        </div>

                      ))}

                    </div>
                  </div>

                ))}

              </div>

            ) : (

              <div className="p-4 bg-stone-50 dark:bg-slate-800/40 rounded-2xl text-center text-xs text-stone-400">

                No hay recetas activas registradas en la ficha
                digital.

              </div>

            )}

          </div>

          {/* ================================================= */}
          {/* CONTACTO DE EMERGENCIA */}
          {/* ================================================= */}

          {clinicalData.profile?.emergencyContactName && (

            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">

                  <Phone className="w-5 h-5 text-teal-300" />

                </div>

                <div>

                  <span className="text-[11px] uppercase tracking-wider font-bold text-blue-900 dark:text-teal-300 block">

                    Contacto de Emergencia Oficial

                  </span>

                  <span className="text-sm font-bold text-blue-950 dark:text-slate-100 block">

                    {
                      clinicalData.profile
                        .emergencyContactName
                    }

                  </span>

                </div>
              </div>

              {clinicalData.profile
                ?.emergencyContactPhone && (

                <a
                  href={`tel:${clinicalData.profile.emergencyContactPhone}`}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >

                  <Phone className="w-3.5 h-3.5 text-teal-300" />

                  <span>
                    Llamar:{' '}
                    {
                      clinicalData.profile
                        .emergencyContactPhone
                    }
                  </span>

                </a>

              )}

            </div>

          )}

        </div>

        {/* =================================================== */}
        {/* SEGURIDAD */}
        {/* =================================================== */}

        <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl flex items-start gap-3">

          <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />

          <div>

            <p className="text-xs font-bold text-blue-950 dark:text-slate-100">
              Acceso autorizado por el paciente
            </p>

            <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">

              Esta consulta está asociada a tu cuenta de médico.
              El acceso finalizará automáticamente cuando expire
              la autorización o cuando el paciente la revoque.

            </p>

          </div>

        </div>

      </main>
    </div>
  );
};