import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { formatRut, validateRut } from '../utils/rutValidator';
import { CardSkeleton, VitalsSkeleton } from '../components/common/SkeletonLoader';
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
  Sparkles
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';

export const DoctorDashboard = () => {
  const { user } = useAuthStore();
  const [searchRut, setSearchRut] = useState('');
  const [rutError, setRutError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [patientFound, setPatientFound] = useState(true);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);

  useMetaTags('Portal Médico', 'Búsqueda clínica por RUT, validación de antecedentes y emisión de recetas en MyMedRecord.');

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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800">
      <Navbar roleTitle="Portal Médico" />

      {/* Contenido Principal con padding inferior seguro para móvil */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28 sm:pb-8">
        {/* Banner de Éxito al Emitir Receta */}
        {prescriptionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-3xl flex items-center justify-between shadow-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold block">Receta Médica Emitida y Cifrada</span>
                <span className="text-[11px] text-emerald-700 block">Sincronizada con la ficha del paciente y registrada en Audit Logs (Ley 21.668).</span>
              </div>
            </div>
            <button onClick={() => setPrescriptionSuccess(false)} className="text-emerald-700 p-1 font-bold">✕</button>
          </div>
        )}

        {/* Buscador Clínico Avanzado */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-blue-950">Búsqueda Unificada de Pacientes</h1>
              <p className="text-xs text-stone-500">
                Consulta el historial interoperable de cualquier paciente de Chile mediante su RUT o escaneo de QR.
              </p>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 rounded-full text-[11px] text-stone-600 border border-stone-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Acceso Auditado
            </span>
          </div>

          <form onSubmit={handleSearch} className="space-y-2 mt-4">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={searchRut}
                  onChange={handleRutChange}
                  placeholder="Ingrese RUT del paciente (ej: 12.345.678-9)"
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl text-slate-800 placeholder-stone-400 focus:outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSearching ? 'Consultando...' : 'Buscar Ficha'}</span>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </button>
              <button
                type="button"
                onClick={() => alert('Activando escáner de código QR temporal de paciente...')}
                className="px-4 py-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-800" />
                <span className="hidden sm:inline">Escanear QR</span>
              </button>
            </div>

            {/* Error Visible de Validación */}
            {rutError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{rutError}</span>
              </div>
            )}
          </form>
        </div>

        {/* KPIs de Atención y Alertas Clínicas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Pacientes Atendidos Hoy</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-blue-950">1</span>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                +1 Consulta
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">Última atención: Ignacio Pérez (RUT: 12.345.678-9)</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Alertas Clínicas IA
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-600">0</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Valores Normales
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">El motor de IA no detecta rangos críticos</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Consentimientos Activos</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-blue-950">1</span>
              <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Vía RUT
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">Autorización vigente por 24 horas</p>
          </div>
        </div>

        {/* Estado de Carga con Skeleton Loader */}
        {isSearching ? (
          <div className="space-y-4">
            <CardSkeleton />
            <VitalsSkeleton />
          </div>
        ) : (
          patientFound && (
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/80 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-black text-lg">
                    IP
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-blue-950">Ignacio Pérez González</h2>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                      <span className="font-mono font-bold text-blue-900">RUT: 12.345.678-9</span>
                      <span>•</span>
                      <span>Edad: 28 años</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ficha Sincronizada
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => alert('Abriendo visor de documentos clínicos PDF...')}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Ver Documentos (PDF)
                  </button>
                  <button 
                    onClick={() => setShowPrescriptionModal(true)}
                    className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-300" />
                    <span>Emitir Receta</span>
                  </button>
                </div>
              </div>

              {/* Timeline Resumido para el Médico */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-xs font-bold text-blue-950 mb-2 block flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-teal-700" /> Signos Vitales Recientes
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-stone-200/60">
                      <span className="text-stone-500">Presión Arterial:</span>
                      <span className="font-bold text-blue-950">120/80 mmHg (Normal)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-200/60">
                      <span className="text-stone-500">Glucosa en ayuno:</span>
                      <span className="font-bold text-blue-950">95.5 mg/dL (Normal)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-500">Frecuencia cardíaca:</span>
                      <span className="font-bold text-blue-950">72 lpm</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-xs font-bold text-blue-950 mb-2 block flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-800" /> Diagnósticos y Medicamentos
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-stone-200/60">
                      <span className="text-stone-500">Condición Crónica:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Sin condiciones</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-200/60">
                      <span className="text-stone-500">Última Receta:</span>
                      <span className="font-bold text-blue-950">Paracetamol 500mg (8h)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-500">Alergias:</span>
                      <span className="font-bold text-rose-700">Ninguna registrada</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Modal para Emitir Receta Médica Cifrada */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Emitir Receta Médica</h3>
                  <p className="text-xs text-stone-500">Paciente: Ignacio Pérez (RUT: 12.345.678-9)</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Medicamento y Concentración</label>
                <input
                  type="text"
                  required
                  defaultValue="Amoxicilina 500mg"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Posología / Frecuencia</label>
                  <input
                    type="text"
                    required
                    defaultValue="1 comprimido cada 8 horas"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Duración Tratamiento</label>
                  <input
                    type="text"
                    required
                    defaultValue="7 días"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Indicaciones Clínicas Adicionales</label>
                <textarea
                  rows="2"
                  defaultValue="Tomar junto con las comidas. Suspender en caso de reacción alérgica."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
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

      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
