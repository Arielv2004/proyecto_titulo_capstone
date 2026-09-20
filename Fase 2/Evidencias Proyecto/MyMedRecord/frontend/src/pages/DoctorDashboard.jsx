import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/useAuthStore';
import {
  getTodayAppointments,
  checkPatientAccess,
} from '../services/appointmentService';

import { useMetaTags } from '../hooks/useMetaTags';
import { TableRowSkeleton } from '../components/common/SkeletonLoader';

import {
  Stethoscope,
  ShieldCheck,
  QrCode,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Users,
  Database,
  RefreshCw,
  Download,
  Lock,
  CalendarDays,
  UserCheck,
  Activity,
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';

export const DoctorDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('CLINICAL');
  const [auditSubTab, setAuditSubTab] = useState('LOGS');

  // ============================================================
  // FICHAS COMPARTIDAS PARA HOY
  // ============================================================

  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] =
    useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const [openingAppointmentId, setOpeningAppointmentId] =
    useState(null);

  const [patientAccessError, setPatientAccessError] = useState('');

  // ============================================================
  // AUDITORÍA DEMO
  // ============================================================

  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  useMetaTags(
    'Portal Médico',
    'Portal médico de MyMedRecord para consultar fichas clínicas compartidas temporalmente por los pacientes.'
  );

  // ============================================================
  // CARGAR FICHAS COMPARTIDAS DEL DÍA
  // ============================================================

  const loadTodayAppointments = async () => {
    try {
      setIsLoadingAppointments(true);
      setAppointmentsError('');

      const data = await getTodayAppointments();

      setAppointments(data || []);
    } catch (error) {
      console.error(
        'Error cargando fichas compartidas:',
        error
      );

      setAppointmentsError(
        error.response?.data?.message ||
          'No fue posible cargar las fichas compartidas para hoy.'
      );

      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadTodayAppointments();
  }, []);

  // ============================================================
  // ABRIR FICHA AUTORIZADA
  // ============================================================

  const handleOpenPatient = async (appointment) => {
    if (appointment.access_status !== 'ACTIVO') {
      return;
    }

    try {
      setOpeningAppointmentId(appointment.id);
      setPatientAccessError('');

      // El backend vuelve a comprobar que el médico tenga
      // autorización vigente para consultar al paciente.
      const access = await checkPatientAccess(
        appointment.patient_id
      );

      setSelectedAppointment(appointment);

      // Para esta etapa del prototipo utilizamos el ID de la
      // autorización/cita como identificador temporal.
      // Más adelante puede reemplazarse por access_grants.
      const temporaryToken =
        access?.appointmentId || appointment.id;

      navigate(`/shared-record/${temporaryToken}`);
    } catch (error) {
      console.error(
        'Acceso a paciente rechazado:',
        error
      );

      setSelectedAppointment(null);

      setPatientAccessError(
        error.response?.data?.message ||
          'No tienes acceso vigente a la ficha de este paciente.'
      );

      loadTodayAppointments();
    } finally {
      setOpeningAppointmentId(null);
    }
  };

  // ============================================================
  // FORMATO DE FECHAS
  // ============================================================

  const formatAppointmentTime = (date) => {
    if (!date) return '--:--';

    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(date));
  };

  const formatAppointmentDate = (date) => {
    if (!date) return '';

    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  // ============================================================
  // RESUMEN DEL DÍA
  // ============================================================

  const activeAccessCount = appointments.filter(
    (appointment) =>
      appointment.access_status === 'ACTIVO'
  ).length;

  const pendingAccessCount = appointments.filter(
    (appointment) =>
      appointment.access_status === 'PENDIENTE'
  ).length;

  const expiredAccessCount = appointments.filter(
    (appointment) =>
      appointment.access_status === 'EXPIRADO'
  ).length;

  // ============================================================
  // BITÁCORA DEMO
  // ============================================================

  const sampleAuditLogs = [
    {
      id: 1,
      action: 'CONSULTA_FICHA',
      user: `${user?.first_name || 'Dr. Ariel'} ${
        user?.last_name || 'Velásquez'
      }`,
      role: 'MEDICO',
      target: 'Ignacio Pérez (12.345.678-9)',
      ip: '192.168.1.84',
      time: 'Hace 5 min',
      status: 'AUTORIZADO',
    },
    {
      id: 2,
      action: 'SUBIDA_DOCUMENTO_OCR',
      user: 'Ignacio Pérez',
      role: 'PACIENTE',
      target: 'Receta médica',
      ip: '192.168.1.84',
      time: 'Hace 18 min',
      status: 'REGISTRADO',
    },
    {
      id: 3,
      action: 'ACCESO_TEMPORAL',
      user: 'Ignacio Pérez',
      role: 'PACIENTE',
      target: 'Dr. Ariel Velásquez',
      ip: '192.168.1.84',
      time: 'Hace 25 min',
      status: 'VIGENTE 5H',
    },
  ];

  // ============================================================
  // USUARIOS DEMO
  // ============================================================

  const sampleUsers = [
    {
      id: '1',
      name: 'Ignacio Pérez',
      rut: '12.345.678-9',
      email: 'paciente@mymedrecord.cl',
      role: 'PACIENTE',
      roleLabel: 'Paciente',
      status: 'ACTIVO',
      created: '28/08/2026',
    },
    {
      id: '2',
      name: 'Dr. Ariel Velásquez',
      rut: '98.765.432-1',
      email: 'medico@mymedrecord.cl',
      role: 'MEDICO',
      roleLabel: 'Médico',
      status: 'ACTIVO',
      created: '28/08/2026',
    },
  ];

  const handleRefreshLogs = () => {
    setIsRefreshingLogs(true);

    setTimeout(() => {
      setIsRefreshingLogs(false);
    }, 600);
  };

  // ============================================================
  // QR DEMO
  // ============================================================

  const handleQrDemo = () => {
    alert(
      'Funcionalidad QR en desarrollo.\n\n' +
        'En la versión final, el paciente podrá generar un código QR temporal para compartir voluntariamente su ficha clínica con un médico.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar roleTitle="Portal Médico" />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28 sm:pb-8">
        {/* ====================================================== */}
        {/* SELECTOR PRINCIPAL                                    */}
        {/* ====================================================== */}

        <div className="flex p-1.5 bg-stone-200/70 dark:bg-slate-800/80 rounded-2xl border border-stone-200 dark:border-slate-700/80 max-w-xl mx-auto shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('CLINICAL')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'CLINICAL'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-blue-950 dark:hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-teal-300" />
            <span>Atención Clínica</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-blue-950 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-300" />
            <span>Auditoría</span>
          </button>
        </div>

        {/* ====================================================== */}
        {/* VISTA CLÍNICA                                         */}
        {/* ====================================================== */}

        {activeTab === 'CLINICAL' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* BIENVENIDA */}

            <div className="bg-gradient-to-r from-blue-950 to-blue-900 text-white rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                    Portal profesional
                  </p>

                  <h1 className="text-2xl font-black mt-1">
                    Bienvenido,{' '}
                    {user?.first_name
                      ? `Dr. ${user.first_name}`
                      : 'Doctor'}
                  </h1>

                  <p className="text-sm text-blue-100 mt-2 max-w-2xl">
                    Consulta las fichas clínicas que los pacientes
                    han compartido voluntariamente contigo para sus
                    atenciones médicas.
                  </p>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-7 h-7 text-teal-300" />
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* FICHAS COMPARTIDAS PARA HOY                       */}
            {/* ================================================== */}

            <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-stone-200/80 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                      <CalendarDays className="w-5 h-5 text-teal-300" />
                    </div>

                    <div>
                      <h2 className="text-xl font-extrabold text-blue-950 dark:text-slate-100">
                        Fichas compartidas para hoy
                      </h2>

                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 capitalize">
                        {appointments.length > 0
                          ? formatAppointmentDate(
                              appointments[0].scheduled_at
                            )
                          : 'Pacientes que autorizaron acceso a su ficha'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={loadTodayAppointments}
                    disabled={isLoadingAppointments}
                    className="px-3.5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isLoadingAppointments
                          ? 'animate-spin'
                          : ''
                      }`}
                    />

                    {isLoadingAppointments
                      ? 'Actualizando...'
                      : 'Actualizar'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                    {appointments.length}{' '}
                    {appointments.length === 1
                      ? 'paciente'
                      : 'pacientes'}{' '}
                    hoy
                  </span>

                  <span className="text-[11px] text-stone-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Acceso temporal autorizado por el paciente
                  </span>
                </div>
              </div>

              {/* ERRORES */}

              {appointmentsError && (
                <div className="m-5 sm:m-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{appointmentsError}</span>
                </div>
              )}

              {patientAccessError && (
                <div className="mx-5 sm:mx-6 mt-5 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>{patientAccessError}</span>
                </div>
              )}

              {/* CARGANDO */}

              {isLoadingAppointments ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 rounded-2xl bg-stone-100 dark:bg-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                /* SIN PACIENTES */

                <div className="p-10 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-stone-400 dark:text-slate-500" />
                  </div>

                  <h3 className="text-sm font-bold text-blue-950 dark:text-slate-100 mt-3">
                    No tienes fichas compartidas para hoy
                  </h3>

                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Cuando un paciente comparta su ficha para una
                    atención, aparecerá en esta sección.
                  </p>
                </div>
              ) : (
                /* LISTADO */

                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {appointments.map((appointment) => {
                    const isActive =
                      appointment.access_status === 'ACTIVO';

                    const isPending =
                      appointment.access_status === 'PENDIENTE';

                    const isExpired =
                      appointment.access_status === 'EXPIRADO';

                    const isOpening =
                      openingAppointmentId === appointment.id;

                    const patientName =
                      `${appointment.patient_first_name || ''} ${
                        appointment.patient_last_name || ''
                      }`.trim();

                    return (
                      <div
                        key={appointment.id}
                        className={`p-5 sm:p-6 transition-colors ${
                          selectedAppointment?.id === appointment.id
                            ? 'bg-blue-50/60 dark:bg-blue-950/20'
                            : 'hover:bg-stone-50/80 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* HORA */}

                          <div className="lg:w-24 shrink-0">
                            <div className="text-2xl font-black text-blue-950 dark:text-slate-100">
                              {formatAppointmentTime(
                                appointment.scheduled_at
                              )}
                            </div>

                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                              Atención
                            </span>
                          </div>

                          {/* PACIENTE */}

                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300 font-black text-sm shrink-0">
                              {(
                                appointment
                                  .patient_first_name?.[0] || 'P'
                              ).toUpperCase()}

                              {(
                                appointment
                                  .patient_last_name?.[0] || ''
                              ).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-blue-950 dark:text-slate-100 truncate">
                                {patientName || 'Paciente'}
                              </h3>

                              <p className="text-xs font-mono font-semibold text-stone-500 dark:text-slate-400 mt-0.5">
                                RUT: {appointment.patient_rut}
                              </p>

                              <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-1">
                                {appointment.reason ||
                                  'Consulta médica'}
                              </p>
                            </div>
                          </div>

                          {/* ESTADO */}

                          <div className="lg:w-48">
                            {isActive && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  ACCESO ACTIVO
                                </span>

                                <p className="text-[10px] text-stone-400 dark:text-slate-500 mt-1.5">
                                  Disponible hasta las{' '}
                                  {formatAppointmentTime(
                                    appointment.access_expires_at
                                  )}
                                </p>
                              </div>
                            )}

                            {isPending && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                                  <Clock className="w-3.5 h-3.5" />
                                  PENDIENTE
                                </span>

                                <p className="text-[10px] text-stone-400 dark:text-slate-500 mt-1.5">
                                  Disponible desde las{' '}
                                  {formatAppointmentTime(
                                    appointment.scheduled_at
                                  )}
                                </p>
                              </div>
                            )}

                            {isExpired && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border border-stone-200 dark:border-slate-700 text-[10px] font-bold">
                                  <Lock className="w-3.5 h-3.5" />
                                  ACCESO EXPIRADO
                                </span>

                                <p className="text-[10px] text-stone-400 dark:text-slate-500 mt-1.5">
                                  Finalizó a las{' '}
                                  {formatAppointmentTime(
                                    appointment.access_expires_at
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* BOTÓN */}

                          <div className="lg:w-32">
                            <button
                              type="button"
                              disabled={!isActive || isOpening}
                              onClick={() =>
                                handleOpenPatient(appointment)
                              }
                              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                isActive
                                  ? 'bg-blue-900 hover:bg-blue-950 text-white cursor-pointer shadow-xs'
                                  : 'bg-stone-100 dark:bg-slate-800 text-stone-400 dark:text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <span>
                                    {isOpening
                                      ? 'Validando...'
                                      : 'Ver ficha'}
                                  </span>

                                  {!isOpening && (
                                    <ArrowRight className="w-3.5 h-3.5 text-teal-300" />
                                  )}
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Bloqueado</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================================================== */}
            {/* ACCESO QR                                         */}
            {/* ================================================== */}

            <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-blue-950 dark:text-slate-100">
                      Acceso mediante QR del paciente
                    </h2>

                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-2xl">
                      El paciente puede generar un código QR temporal
                      para compartir voluntariamente su ficha clínica
                      durante una atención médica.
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Acceso temporal y controlado
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQrDemo}
                  className="px-5 py-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <QrCode className="w-4 h-4" />
                  Escanear QR
                </button>
              </div>
            </div>

            {/* ================================================== */}
            {/* RESUMEN DEL DÍA                                   */}
            {/* ================================================== */}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-900 dark:text-teal-300" />

                <h2 className="text-sm font-bold text-blue-950 dark:text-slate-100">
                  Resumen de accesos
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* ACTIVOS */}

                <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Accesos activos
                  </span>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-blue-950 dark:text-slate-100">
                      {activeAccessCount}
                    </span>

                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Vigentes
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">
                    Fichas disponibles actualmente para consulta.
                  </p>
                </div>

                {/* PENDIENTES */}

                <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Próximos accesos
                  </span>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-blue-950 dark:text-slate-100">
                      {pendingAccessCount}
                    </span>

                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      Pendientes
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">
                    Autorizaciones que todavía no comienzan.
                  </p>
                </div>

                {/* EXPIRADOS */}

                <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-stone-500" />
                    Accesos finalizados
                  </span>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-blue-950 dark:text-slate-100">
                      {expiredAccessCount}
                    </span>

                    <span className="text-xs font-semibold text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-stone-200 dark:border-slate-700">
                      Expirados
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">
                    El médico ya no puede consultar estas fichas.
                  </p>
                </div>
              </div>
            </div>

            {/* AVISO DE PRIVACIDAD */}

            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-800 dark:text-teal-300 shrink-0 mt-0.5" />

              <div>
                <h3 className="text-xs font-bold text-blue-950 dark:text-blue-100">
                  Acceso controlado a información clínica
                </h3>

                <p className="text-[11px] text-blue-800/80 dark:text-blue-200/70 mt-1">
                  MyMedRecord permite consultar únicamente las fichas
                  que han sido compartidas por el paciente y cuyo
                  período de acceso se encuentra vigente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* VISTA AUDITORÍA                                       */}
        {/* ====================================================== */}

        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* HEADER */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-blue-950 dark:text-slate-100">
                  Auditoría y trazabilidad
                </h2>

                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  Registro demostrativo de accesos y acciones
                  realizadas dentro de MyMedRecord.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshLogs}
                  disabled={isRefreshingLogs}
                  className="px-3.5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-blue-900 dark:text-teal-300 ${
                      isRefreshingLogs ? 'animate-spin' : ''
                    }`}
                  />

                  <span>
                    {isRefreshingLogs
                      ? 'Actualizando...'
                      : 'Actualizar'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    alert(
                      'Exportación de bitácora disponible en una etapa posterior del prototipo.'
                    )
                  }
                  className="px-3.5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-300" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* MÉTRICAS */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-800 dark:text-teal-300" />
                  Usuarios demo
                </span>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-blue-950 dark:text-slate-100">
                    {sampleUsers.length}
                  </span>

                  <span className="text-xs font-bold text-blue-800 dark:text-teal-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Paciente · Médico
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">
                  Usuarios utilizados para demostrar el prototipo.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  Trazabilidad
                </span>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-teal-800 dark:text-teal-300">
                    {sampleAuditLogs.length}
                  </span>

                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Eventos demo
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">
                  Accesos y acciones visibles para demostración.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  Base de datos
                </span>

                <div className="mt-3">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PostgreSQL 15
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-3">
                  Base de datos ejecutándose mediante Docker.
                </p>
              </div>
            </div>

            {/* TABLA */}

            <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setAuditSubTab('LOGS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    auditSubTab === 'LOGS'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-400'
                  }`}
                >
                  Bitácora ({sampleAuditLogs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAuditSubTab('USERS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    auditSubTab === 'USERS'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-400'
                  }`}
                >
                  Usuarios ({sampleUsers.length})
                </button>
              </div>

              {auditSubTab === 'LOGS' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">
                          Acción
                        </th>
                        <th className="py-2.5 px-3">
                          Usuario
                        </th>
                        <th className="py-2.5 px-3">
                          Objetivo
                        </th>
                        <th className="py-2.5 px-3">
                          IP
                        </th>
                        <th className="py-2.5 px-3">
                          Momento
                        </th>
                        <th className="py-2.5 px-3">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                      {isRefreshingLogs ? (
                        <>
                          <TableRowSkeleton columns={6} />
                          <TableRowSkeleton columns={6} />
                          <TableRowSkeleton columns={6} />
                        </>
                      ) : (
                        sampleAuditLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-3 font-mono font-bold text-blue-950 dark:text-slate-100">
                              {log.action}
                            </td>

                            <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {log.user}{' '}
                              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold">
                                ({log.role})
                              </span>
                            </td>

                            <td className="py-3 px-3 text-stone-600 dark:text-slate-400">
                              {log.target}
                            </td>

                            <td className="py-3 px-3 font-mono text-stone-500 dark:text-slate-500 text-[11px]">
                              {log.ip}
                            </td>

                            <td className="py-3 px-3 text-stone-500 dark:text-slate-400">
                              {log.time}
                            </td>

                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">
                          Nombre
                        </th>
                        <th className="py-2.5 px-3">
                          RUT
                        </th>
                        <th className="py-2.5 px-3">
                          Correo
                        </th>
                        <th className="py-2.5 px-3">
                          Rol
                        </th>
                        <th className="py-2.5 px-3">
                          Fecha alta
                        </th>
                        <th className="py-2.5 px-3">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                      {sampleUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-3 font-bold text-blue-950 dark:text-slate-100">
                            {u.name}
                          </td>

                          <td className="py-3 px-3 font-mono text-stone-700 dark:text-slate-300">
                            {u.rut}
                          </td>

                          <td className="py-3 px-3 text-stone-600 dark:text-slate-400">
                            {u.email}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                u.role === 'PACIENTE'
                                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {u.roleLabel}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-stone-500 dark:text-slate-400">
                            {u.created}
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />

      <footer className="py-4 text-center text-[11px] text-stone-400 dark:text-slate-500 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        MyMedRecord · Plataforma de gestión y acceso controlado a
        información clínica
      </footer>
    </div>
  );
};