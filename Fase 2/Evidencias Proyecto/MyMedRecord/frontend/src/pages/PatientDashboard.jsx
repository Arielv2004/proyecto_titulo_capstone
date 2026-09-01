import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { 
  HeartHandshake, 
  UploadCloud, 
  Clock, 
  Shield, 
  LogOut, 
  HeartPulse, 
  Activity, 
  FileText, 
  QrCode, 
  UserCheck, 
  Plus, 
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Navigation
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';
import { useMetaTags } from '../hooks/useMetaTags';

export const PatientDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  useMetaTags('Portal Paciente', 'Gestiona tu ficha clínica unificada, recetas inteligentes y signos vitales en MyMedRecord.');

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800">
      {/* Barra de Navegación con Desplegable de Usuario y Configuración */}
      <Navbar roleTitle="Portal Paciente" />

      {/* Contenido Principal con padding inferior para no tapar la barra móvil */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28 sm:pb-8">
        {/* Tarjeta de Bienvenida Cálida */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-teal-900 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Ficha Médica Activa
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Hola, {user?.first_name || 'Paciente'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-xl">
              Aquí puedes gestionar tus recetas médicas, exámenes de laboratorio y compartir tu información de salud con tu médico en cualquier centro asistencial de Chile.
            </p>
          </div>

          <button
            onClick={() => setShowVitalsModal(true)}
            className="w-full md:w-auto px-5 py-3 bg-teal-400 hover:bg-teal-300 text-blue-950 font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Signos Vitales</span>
          </button>
        </div>

        {/* Acciones Rápidas (Pilares del Negocio e Interoperabilidad) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Subida Documental con IA */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-50 text-teal-800 rounded-full border border-teal-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> IA / OCR
                </span>
              </div>
              <h2 className="text-base font-bold text-blue-950">Subir Receta o Examen</h2>
              <p className="text-xs text-stone-500 mt-1.5">
                Saca una foto desde tu iPhone o sube un PDF para extraer medicamentos y diagnósticos.
              </p>
            </div>
            <button className="mt-4 w-full py-2.5 bg-stone-50 hover:bg-teal-50 border border-stone-200 hover:border-teal-200 text-teal-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span>Escanear Documento</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Timeline Cronológico */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                  Historial
                </span>
              </div>
              <h2 className="text-base font-bold text-blue-950">Línea de Tiempo</h2>
              <p className="text-xs text-stone-500 mt-1.5">
                Revisa de forma cronológica tus atenciones, recetas y evolución clínica.
              </p>
            </div>
            <button className="mt-4 w-full py-2.5 bg-stone-50 hover:bg-blue-50 border border-stone-200 hover:border-blue-200 text-blue-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span>Ver Historial</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3. Permisos y QR */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-800">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                  Ley 20.584
                </span>
              </div>
              <h2 className="text-base font-bold text-blue-950">Compartir Ficha</h2>
              <p className="text-xs text-stone-500 mt-1.5">
                Genera un código QR o autoriza temporalmente a un médico por su RUT.
              </p>
            </div>
            <button className="mt-4 w-full py-2.5 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 text-amber-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span>Gestionar QR</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel de Signos Vitales y Estado de Salud */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-blue-950">Signos Vitales y Métricas</h2>
                <p className="text-xs text-stone-500">Última medición sincronizada con tu ficha</p>
              </div>
            </div>

            <button
              onClick={() => setShowVitalsModal(true)}
              className="text-xs font-bold text-blue-800 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Medición</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Presión Arterial</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-blue-950">120/80</span>
                <span className="text-[11px] font-semibold text-stone-400">mmHg</span>
              </div>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-100/70 rounded-md">
                Óptima
              </span>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Frecuencia Cardíaca</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-blue-950">72</span>
                <span className="text-[11px] font-semibold text-stone-400">lpm</span>
              </div>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-100/70 rounded-md">
                Normal
              </span>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Glucosa en Sangre</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-blue-950">95.5</span>
                <span className="text-[11px] font-semibold text-stone-400">mg/dL</span>
              </div>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-100/70 rounded-md">
                En Rango
              </span>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Saturación O₂</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-blue-950">98</span>
                <span className="text-[11px] font-semibold text-stone-400">% SpO2</span>
              </div>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-100/70 rounded-md">
                Excelente
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal para Registrar Signos Vitales */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-blue-950">Registrar Signos Vitales</h3>
              </div>
              <button
                onClick={() => setShowVitalsModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowVitalsModal(false); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Presión Sistólica</label>
                  <input
                    type="number"
                    placeholder="120"
                    defaultValue="120"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Presión Diastólica</label>
                  <input
                    type="number"
                    placeholder="80"
                    defaultValue="80"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Frecuencia (lpm)</label>
                  <input
                    type="number"
                    placeholder="75"
                    defaultValue="75"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Glucosa (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="95.0"
                    defaultValue="95.0"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Guardar en Ficha Clínica
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Navegación Rápida Móvil (PWA) */}
      <BottomNav onOpenVitalsModal={() => setShowVitalsModal(true)} />

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
