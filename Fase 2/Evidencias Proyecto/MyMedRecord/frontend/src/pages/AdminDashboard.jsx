import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { TableRowSkeleton } from '../components/common/SkeletonLoader';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  Database, 
  CheckCircle2, 
  Lock, 
  RefreshCw, 
  Activity, 
  ShieldAlert, 
  Filter,
  Download
} from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';

export const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('AUDIT'); // 'AUDIT' | 'USERS'

  useMetaTags('Portal Administrador', 'Panel de auditoría continua, control de usuarios y trazabilidad clínica bajo Ley 21.668 en MyMedRecord.');

  const sampleAuditLogs = [
    { id: 1, action: 'READ_PATIENT_RECORD', user: 'Dr. Ariel González', role: 'MEDICO', target: 'Ignacio Pérez (12.345.678-9)', ip: '192.168.1.84', time: 'Hace 5 min', status: 'AUTORIZADO (RUT)' },
    { id: 2, action: 'UPLOAD_PRESCRIPTION_OCR', user: 'Ignacio Pérez', role: 'PACIENTE', target: 'Receta Médica PDF', ip: '192.168.1.84', time: 'Hace 18 min', status: 'CIFRADO AES-256' },
    { id: 3, action: 'GRANT_CONSENT_TEMPORAL', user: 'Ignacio Pérez', role: 'PACIENTE', target: 'Dr. Ariel González', ip: '192.168.1.84', time: 'Hace 25 min', status: 'VIGENTE 24H' },
    { id: 4, action: 'ADMIN_SYSTEM_DIAGNOSTIC', user: 'Sergio Silva', role: 'ADMIN', target: 'PostgreSQL 15', ip: '127.0.0.1', time: 'Hace 1 hora', status: 'SALUDABLE' },
  ];

  const sampleUsers = [
    { id: '1', name: 'Ignacio Pérez', rut: '12.345.678-9', email: 'paciente@mymedrecord.cl', role: 'PACIENTE', status: 'ACTIVO', created: '28/08/2026' },
    { id: '2', name: 'Dr. Ariel González', rut: '98.765.432-1', email: 'medico@mymedrecord.cl', role: 'MEDICO', status: 'ACTIVO', created: '28/08/2026' },
    { id: '3', name: 'Sergio Silva', rut: '11.223.344-5', email: 'admin@mymedrecord.cl', role: 'ADMIN', status: 'ACTIVO', created: '28/08/2026' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800">
      <Navbar roleTitle="Portal Administrador" />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28 sm:pb-8">
        {/* Encabezado y Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-blue-950">Panel de Auditoría y Trazabilidad</h1>
            <p className="text-xs text-stone-500">
              Cumplimiento normativo de seguridad de la información y Ley N° 21.668.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-900 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar'}</span>
            </button>

            <button
              onClick={() => alert('Exportando bitácora de auditoría inmutable en formato CSV para cumplimiento Minsal...')}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-300" />
              <span>Exportar Logs</span>
            </button>
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-800" /> Usuarios en PostgreSQL
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-blue-950">3</span>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                1 Paciente · 1 Médico · 1 Admin
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">Roles verificados bajo RBAC</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-700" /> Trazabilidad de Accesos
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-teal-800">100%</span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Activa
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">Tabla audit_logs registrando lecturas y escrituras</p>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-700" /> Infraestructura Docker
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL 15 & pgAdmin (OK)
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">Puerto 5432 y 5050 operativos</p>
          </div>
        </div>

        {/* Tabla de Auditoría / Gestión de Usuarios */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('AUDIT')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'AUDIT'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                Bitácora de Auditoría (Audit Logs)
              </button>
              <button
                onClick={() => setActiveTab('USERS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'USERS'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                Usuarios Registrados ({sampleUsers.length})
              </button>
            </div>
          </div>

          {activeTab === 'AUDIT' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Acción Registrada</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Objetivo / Ficha</th>
                    <th className="py-2.5 px-3">IP Origen</th>
                    <th className="py-2.5 px-3">Momento</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isRefreshing ? (
                    <>
                      <TableRowSkeleton columns={6} />
                      <TableRowSkeleton columns={6} />
                      <TableRowSkeleton columns={6} />
                    </>
                  ) : (
                    sampleAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-950">{log.action}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {log.user} <span className="text-[10px] text-stone-400 font-bold">({log.role})</span>
                        </td>
                        <td className="py-3 px-3 text-stone-600">{log.target}</td>
                        <td className="py-3 px-3 font-mono text-stone-500 text-[11px]">{log.ip}</td>
                        <td className="py-3 px-3 text-stone-500">{log.time}</td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
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
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3">RUT Oficial</th>
                    <th className="py-2.5 px-3">Correo</th>
                    <th className="py-2.5 px-3">Rol RBAC</th>
                    <th className="py-2.5 px-3">Fecha Alta</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sampleUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-950">{u.name}</td>
                      <td className="py-3 px-3 font-mono text-stone-700">{u.rut}</td>
                      <td className="py-3 px-3 text-stone-600">{u.email}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-500">{u.created}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
      </main>

      {/* Barra de Navegación Rápida Móvil (PWA) */}
      <BottomNav />

      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
