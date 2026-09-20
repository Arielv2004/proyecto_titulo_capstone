import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { formatRut, validateRut } from '../utils/rutValidator';
import { CardSkeleton, VitalsSkeleton, TableRowSkeleton } from '../components/common/SkeletonLoader';
import { 
  Stethoscope, 
  Search, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  QrCode, 
  FileText, 
  Clock, 
  HeartPulse, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  Plus,
  X,
  Sparkles,
  Users,
  Database,
  RefreshCw,
  Download,
  Activity,
  Lock
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';

export const DoctorDashboard = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('CLINICAL'); // 'CLINICAL' | 'AUDIT'
  const [auditSubTab, setAuditSubTab] = useState('LOGS'); // 'LOGS' | 'USERS'
  const [searchRut, setSearchRut] = useState('');
  const [rutError, setRutError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [patientFound, setPatientFound] = useState(true);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  useMetaTags('Portal Médico Administrador', 'Búsqueda clínica por RUT, validación de antecedentes, emisión de recetas y auditoría Ley 21.668 en MyMedRecord.');

  // Bitácora de auditoría inmutable (Ley 21.668)
  const sampleAuditLogs = [
    { id: 1, action: 'CONSULTA_FICHA_RUT', user: `${user?.first_name || 'Dr. Ariel'} ${user?.last_name || 'Velásquez'}`, role: 'MEDICO', target: 'Ignacio Pérez (12.345.678-9)', ip: '192.168.1.84', time: 'Hace 5 min', status: 'AUTORIZADO (RUT)' },
    { id: 2, action: 'SUBIDA_RECETA_OCR', user: 'Ignacio Pérez', role: 'PACIENTE', target: 'Receta Médica PDF (Amoxicilina)', ip: '192.168.1.84', time: 'Hace 18 min', status: 'CIFRADO AES-256' },
    { id: 3, action: 'CONSENTIMIENTO_QR_ACTIVO', user: 'Ignacio Pérez', role: 'PACIENTE', target: 'Dr. Ariel Velásquez', ip: '192.168.1.84', time: 'Hace 25 min', status: 'VIGENTE 24H' },
    { id: 4, action: 'EMISION_RECETA_ELECTRONICA', user: `${user?.first_name || 'Dr. Ariel'} ${user?.last_name || 'Velásquez'}`, role: 'MEDICO', target: 'Amoxicilina 875mg / Clavulánico', ip: '127.0.0.1', time: 'Hace 1 hora', status: 'FIRMA DIGITAL OK' },
  ];

  // Solo los 2 roles oficiales del ecosistema: PACIENTE y MEDICO
  const sampleUsers = [
    { id: '1', name: 'Ignacio Pérez', rut: '12.345.678-9', email: 'paciente@mymedrecord.cl', role: 'PACIENTE', roleLabel: 'Paciente Titular', status: 'ACTIVO', created: '28/08/2026' },
    { id: '2', name: 'Dr. Ariel Velásquez', rut: '98.765.432-1', email: 'medico@mymedrecord.cl', role: 'MEDICO', roleLabel: 'Médico Administrador', status: 'ACTIVO', created: '28/08/2026' },
  ];

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setSearchRut(formatted);
    setRutError('');
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchRut.trim()) {
      setRutError('Por favor ingresa un RUT de paciente.');
      return;
    }

    if (!validateRut(searchRut)) {
      setRutError('El RUT ingresado no es válido según el algoritmo chileno (Módulo 11).');
      return;
    }

    setRutError('');
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setPatientFound(true);
    }, 600);
  };

  const handleSavePrescription = (e) => {
    e.preventDefault();
    setShowPrescriptionModal(false);
    setPrescriptionSuccess(true);
    setTimeout(() => setPrescriptionSuccess(false), 4000);
  };

  const handleRefreshLogs = () => {
    setIsRefreshingLogs(true);
    setTimeout(() => setIsRefreshingLogs(false), 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar roleTitle="Portal Médico Administrador" />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28 sm:pb-8">
        
        {/* Selector de Pestañas Principales del Médico Administrador */}
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
            <span>Atención y Consultas Clínicas</span>
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
            <span>Supervisión y Auditoría (Ley 21.668)</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* VISTA 1: ATENCIÓN Y CONSULTAS CLÍNICAS                         */}
        {/* ============================================================== */}
        {activeTab === 'CLINICAL' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner de Éxito al Emitir Receta */}
            {prescriptionSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-3xl flex items-center justify-between shadow-xs animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Receta Médica Electrónica Emitida y Cifrada</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">Sincronizada con la ficha del paciente y registrada en Audit Logs (Ley 21.668).</span>
                  </div>
                </div>
                <button onClick={() => setPrescriptionSuccess(false)} className="text-emerald-700 dark:text-emerald-400 p-1 font-bold cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Buscador Clínico Avanzado */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-lg font-bold text-blue-950 dark:text-slate-100">Búsqueda Unificada de Pacientes</h1>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Consulta el historial interoperable de cualquier paciente de Chile mediante su RUT o escaneo de QR.
                  </p>
                </div>
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 dark:bg-slate-800 rounded-full text-[11px] text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Acceso Auditado
                </span>
              </div>

              <form onSubmit={handleSearch} className="space-y-2 mt-4">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={searchRut}
                      onChange={handleRutChange}
                      placeholder="Ingrese RUT del paciente (ej: 12.345.678-9)"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-slate-800/80 border border-stone-300 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all text-sm font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-3 bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSearching ? 'Consultando...' : 'Buscar Ficha'}</span>
                    <ArrowRight className="w-4 h-4 text-teal-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Activando escáner de código QR temporal de paciente...')}
                    className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                    <span className="hidden sm:inline">Escanear QR</span>
                  </button>
                </div>

                {/* Error Visible de Validación */}
                {rutError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{rutError}</span>
                  </div>
                )}
              </form>
            </div>

            {/* KPIs de Atención y Alertas Clínicas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider block">Pacientes Atendidos Hoy</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-blue-950 dark:text-slate-100">1</span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    +1 Consulta
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">Última atención: Ignacio Pérez (RUT: 12.345.678-9)</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Alertas Clínicas IA
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400">0</span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Valores Normales
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">El motor de IA no detecta rangos críticos</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider block">Consentimientos Activos</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-blue-950 dark:text-slate-100">1</span>
                  <span className="text-xs font-semibold text-blue-800 dark:text-teal-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Vía RUT
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">Autorización vigente por 24 horas</p>
              </div>
            </div>

            {/* Ficha del Paciente Encontrado */}
            {isSearching ? (
              <div className="space-y-4">
                <CardSkeleton />
                <VitalsSkeleton />
              </div>
            ) : (
              patientFound && (
                <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/80 dark:border-slate-800 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300 font-black text-lg">
                        IP
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-blue-950 dark:text-slate-100">Ignacio Pérez González</h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono font-bold text-blue-900 dark:text-teal-300">RUT: 12.345.678-9</span>
                          <span>•</span>
                          <span>Edad: 28 años</span>
                          <span>•</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ficha Sincronizada
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => alert('Abriendo visor de documentos clínicos PDF...')}
                        className="px-3.5 py-2 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Ver Documentos (PDF)
                      </button>
                      <button 
                        onClick={() => setShowPrescriptionModal(true)}
                        className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-teal-300" />
                        <span>Emitir Receta</span>
                      </button>
                    </div>
                  </div>

                  {/* Timeline y Antecedentes para el Médico Administrador */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-800">
                      <span className="text-xs font-bold text-blue-950 dark:text-slate-100 mb-2 block flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-teal-700 dark:text-teal-400" /> Signos Vitales Recientes
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700">
                          <span className="text-stone-500 dark:text-slate-400">Presión Arterial:</span>
                          <span className="font-bold text-blue-950 dark:text-slate-200">120/80 mmHg (Normal)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700">
                          <span className="text-stone-500 dark:text-slate-400">Glucosa en ayuno:</span>
                          <span className="font-bold text-blue-950 dark:text-slate-200">95.5 mg/dL (Normal)</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-stone-500 dark:text-slate-400">Frecuencia cardíaca:</span>
                          <span className="font-bold text-blue-950 dark:text-slate-200">72 lpm</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-800">
                      <span className="text-xs font-bold text-blue-950 dark:text-slate-100 mb-2 block flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" /> Antecedentes y Recetas Activas
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700">
                          <span className="font-bold text-blue-950 dark:text-slate-100 block">Amoxicilina 875mg + Ác. Clavulánico</span>
                          <span className="text-stone-500 dark:text-slate-400 text-[11px] block mt-0.5">1 comprimido c/12 hrs · Vigente hasta 20/09/2026</span>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="font-bold text-stone-700 dark:text-slate-300">Alergia conocida:</span>
                          <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-md font-bold text-[11px]">
                            Penicilina
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: SUPERVISIÓN Y AUDITORÍA LEY 21.668                   */}
        {/* ============================================================== */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header de Auditoría y Exportación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-blue-950 dark:text-slate-100">
                  Panel de Auditoría y Trazabilidad Continua
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  Cumplimiento estricto de la <strong>Ley N° 21.668</strong> (Interoperabilidad de la Ficha Clínica) y <strong>Ley N° 20.584</strong> (Derechos del Paciente).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshLogs}
                  disabled={isRefreshingLogs}
                  className="px-3.5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-900 dark:text-teal-300 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingLogs ? 'Sincronizando...' : 'Actualizar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Exportando bitácora inmutable en formato CSV para fiscalización Minsal / Ley 21.668...')}
                  className="px-3.5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-300" />
                  <span>Exportar Bitácora</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Métricas de Seguridad y Cumplimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-800 dark:text-teal-300" /> Usuarios en PostgreSQL
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-blue-950 dark:text-slate-100">{sampleUsers.length}</span>
                  <span className="text-xs font-bold text-blue-800 dark:text-teal-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    1 Paciente · 1 Médico Admin
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">Roles exclusivos bajo RBAC canónico</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" /> Trazabilidad de Accesos
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-teal-800 dark:text-teal-300">100%</span>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Inmutable
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">Tabla audit_logs registrando lecturas y emisiones</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-700 dark:text-indigo-400" /> Motor Relacional
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL 15 (Docker)
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-2">CHECK (role IN ('PACIENTE', 'MEDICO'))</p>
              </div>
            </div>

            {/* Sub-selector y Tablas de Auditoría */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuditSubTab('LOGS')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      auditSubTab === 'LOGS'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-400'
                    }`}
                  >
                    Bitácora de Eventos ({sampleAuditLogs.length})
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
                    Usuarios Oficiales del Sistema ({sampleUsers.length})
                  </button>
                </div>
              </div>

              {auditSubTab === 'LOGS' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Acción Registrada</th>
                        <th className="py-2.5 px-3">Usuario / Profesional</th>
                        <th className="py-2.5 px-3">Objetivo / Ficha</th>
                        <th className="py-2.5 px-3">IP Origen</th>
                        <th className="py-2.5 px-3">Momento</th>
                        <th className="py-2.5 px-3">Estado</th>
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
                          <tr key={log.id} className="hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-blue-950 dark:text-slate-100">{log.action}</td>
                            <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {log.user} <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold">({log.role})</span>
                            </td>
                            <td className="py-3 px-3 text-stone-600 dark:text-slate-400">{log.target}</td>
                            <td className="py-3 px-3 font-mono text-stone-500 dark:text-slate-500 text-[11px]">{log.ip}</td>
                            <td className="py-3 px-3 text-stone-500 dark:text-slate-400">{log.time}</td>
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
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">RUT Oficial</th>
                        <th className="py-2.5 px-3">Correo</th>
                        <th className="py-2.5 px-3">Rol RBAC</th>
                        <th className="py-2.5 px-3">Fecha Alta</th>
                        <th className="py-2.5 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                      {sampleUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-blue-950 dark:text-slate-100">{u.name}</td>
                          <td className="py-3 px-3 font-mono text-stone-700 dark:text-slate-300">{u.rut}</td>
                          <td className="py-3 px-3 text-stone-600 dark:text-slate-400">{u.email}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              u.role === 'PACIENTE'
                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                            }`}>
                              {u.roleLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-stone-500 dark:text-slate-400">{u.created}</td>
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

      {/* Modal para Emitir Receta Médica Electrónica */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-stone-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950 dark:text-slate-100">Nueva Receta Médica Electrónica</h3>
                  <p className="text-[11px] text-stone-400 dark:text-slate-500">Paciente: Ignacio Pérez (12.345.678-9)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrescriptionModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">Diagnóstico Clínico (CIE-10)</label>
                <input
                  type="text"
                  required
                  defaultValue="J06.9 - Infección respiratoria aguda"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">Medicamento y Concentración</label>
                <input
                  type="text"
                  required
                  defaultValue="Amoxicilina 500mg"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">Posología / Frecuencia</label>
                  <input
                    type="text"
                    required
                    defaultValue="1 comprimido cada 8 horas"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">Duración Tratamiento</label>
                  <input
                    type="text"
                    required
                    defaultValue="7 días"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">Indicaciones Clínicas Adicionales</label>
                <textarea
                  rows="2"
                  defaultValue="Tomar junto con las comidas. Suspender en caso de reacción alérgica."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span>Cifrar y Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Navegación Rápida Móvil (PWA) */}
      <BottomNav />

      <footer className="py-4 text-center text-[11px] text-stone-400 dark:text-slate-500 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
