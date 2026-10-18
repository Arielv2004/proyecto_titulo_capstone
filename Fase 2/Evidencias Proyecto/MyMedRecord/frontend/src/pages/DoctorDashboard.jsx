import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

import { useMetaTags } from '../hooks/useMetaTags';
import { TableRowSkeleton } from '../components/common/SkeletonLoader';

import { Stethoscope, ShieldCheck, FileText, CheckCircle2, Users, Database, RefreshCw, Download } from 'lucide-react';

import { Navbar } from '../components/common/Navbar';
import { DoctorHome } from '../components/doctor/DoctorHome';
import { SectionNav, Notice } from '../components/ui/ClinicalUI';

export const DoctorDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('CLINICAL');
  const [auditSubTab, setAuditSubTab] = useState('LOGS');

  const [directShares, setDirectShares] = useState([]);
  const [isLoadingDirectShares, setIsLoadingDirectShares] = useState(true);
  const [directSharesError, setDirectSharesError] = useState('');

  const loadDirectShares = async () => {
    try {
      setIsLoadingDirectShares(true);
      setDirectSharesError('');

      const response = await api.get('/access-grants/shared-with-me');
      const data = response.data?.data ?? response.data ?? [];

      setDirectShares(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando accesos directos:', error);
      setDirectSharesError(
        error.response?.data?.message ||
          'No fue posible cargar las fichas compartidas directamente contigo.'
      );
      setDirectShares([]);
    } finally {
      setIsLoadingDirectShares(false);
    }
  };

  // ============================================================
  // AUDITORÍA DEMO
  // ============================================================

  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  useMetaTags(
    'Portal Médico',
    'Portal médico de MyMedRecord para consultar fichas clínicas compartidas temporalmente por los pacientes.'
  );

  useEffect(() => { loadDirectShares(); }, []);

  const handleOpenDirectShare = (grant) => {
    if (grant.status !== 'ACTIVO' || grant.isRevoked) return;

    if (!grant.token) {
      setDirectSharesError('Este acceso no tiene un token válido.');
      return;
    }

    navigate(`/shared-record/${grant.token}`);
  };

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

  return (
    <div className="min-h-screen flex flex-col bg-canvas dark:bg-canvas text-body dark:text-ink transition-colors">
      <Navbar roleTitle="Portal Médico" />

      <main id="main-content" tabIndex={-1} className="mm-shell space-y-6">
        {/* ====================================================== */}
        {/* SELECTOR PRINCIPAL                                    */}
        {/* ====================================================== */}

        <SectionNav value={activeTab} onChange={setActiveTab} items={[{id:'CLINICAL',label:'Pacientes',icon:Stethoscope},{id:'AUDIT',label:'Auditoría · demo',icon:ShieldCheck}]} />

        {activeTab === 'CLINICAL' && <DoctorHome shares={directShares} loading={isLoadingDirectShares} error={directSharesError} onRefresh={loadDirectShares} onOpen={handleOpenDirectShare} onQr={() => navigate('/doctor/qr-access')} />}

        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <Notice title="Vista de demostración" tone="warning">Los usuarios, cifras y eventos de esta sección son ejemplos. No representan la actividad real del sistema.</Notice>
            {/* HEADER */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-6 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-ink dark:text-ink">
                  Auditoría y trazabilidad
                </h2>

                <p className="text-xs text-muted dark:text-muted mt-1">
                  Registro demostrativo de accesos y acciones
                  realizadas dentro de MyMedRecord.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshLogs}
                  disabled={isRefreshingLogs}
                  className="px-3.5 py-2.5 bg-surface-muted dark:bg-surface-muted hover:bg-surface-muted dark:hover:bg-slate-700 text-body dark:text-body text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-accent-ink dark:text-teal-300 ${
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
                  className="px-3.5 py-2.5 bg-action hover:bg-action-hover text-on-action text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-300" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* MÉTRICAS */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-5 shadow-xs">
                <span className="text-xs font-bold text-muted dark:text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent-ink dark:text-teal-300" />
                  Usuarios demo
                </span>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-ink dark:text-ink">
                    {sampleUsers.length}
                  </span>

                  <span className="text-xs font-bold text-accent-ink dark:text-teal-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Paciente · Médico
                  </span>
                </div>

                <p className="text-xs text-muted dark:text-muted mt-2">
                  Usuarios utilizados para demostrar el prototipo.
                </p>
              </div>

              <div className="bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-5 shadow-xs">
                <span className="text-xs font-bold text-muted dark:text-muted uppercase tracking-wider flex items-center gap-1.5">
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

                <p className="text-xs text-muted dark:text-muted mt-2">
                  Accesos y acciones visibles para demostración.
                </p>
              </div>

              <div className="bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-5 shadow-xs">
                <span className="text-xs font-bold text-muted dark:text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  Base de datos
                </span>

                <div className="mt-3">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PostgreSQL 15
                  </span>
                </div>

                <p className="text-xs text-muted dark:text-muted mt-3">
                  Base de datos ejecutándose mediante Docker.
                </p>
              </div>
            </div>

            {/* TABLA */}

            <div className="bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 dark:border-line pb-3">
                <button
                  type="button"
                  onClick={() => setAuditSubTab('LOGS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    auditSubTab === 'LOGS'
                      ? 'bg-action text-on-action shadow-xs'
                      : 'bg-surface-muted dark:bg-surface-muted hover:bg-surface-muted dark:hover:bg-slate-700 text-muted dark:text-muted'
                  }`}
                >
                  Bitácora ({sampleAuditLogs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAuditSubTab('USERS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    auditSubTab === 'USERS'
                      ? 'bg-action text-on-action shadow-xs'
                      : 'bg-surface-muted dark:bg-surface-muted hover:bg-surface-muted dark:hover:bg-slate-700 text-muted dark:text-muted'
                  }`}
                >
                  Usuarios ({sampleUsers.length})
                </button>
              </div>

              {auditSubTab === 'LOGS' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line dark:border-line text-muted dark:text-muted font-bold uppercase tracking-wider text-xs">
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
                            className="hover:bg-canvas/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-3 font-mono font-bold text-ink dark:text-ink">
                              {log.action}
                            </td>

                            <td className="py-3 px-3 font-medium text-body dark:text-body">
                              {log.user}{' '}
                              <span className="text-xs text-muted dark:text-muted font-bold">
                                ({log.role})
                              </span>
                            </td>

                            <td className="py-3 px-3 text-muted dark:text-muted">
                              {log.target}
                            </td>

                            <td className="py-3 px-3 font-mono text-muted dark:text-muted text-xs">
                              {log.ip}
                            </td>

                            <td className="py-3 px-3 text-muted dark:text-muted">
                              {log.time}
                            </td>

                            <td className="py-3 px-3">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                      <tr className="border-b border-line dark:border-line text-muted dark:text-muted font-bold uppercase tracking-wider text-xs">
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
                          className="hover:bg-canvas/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-3 font-bold text-ink dark:text-ink">
                            {u.name}
                          </td>

                          <td className="py-3 px-3 font-mono text-body dark:text-body">
                            {u.rut}
                          </td>

                          <td className="py-3 px-3 text-muted dark:text-muted">
                            {u.email}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                u.role === 'PACIENTE'
                                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-accent-ink dark:text-blue-200 border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {u.roleLabel}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-muted dark:text-muted">
                            {u.created}
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
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

      <footer className="py-4 text-center text-xs text-muted dark:text-muted border-t border-line dark:border-line bg-surface dark:bg-surface transition-colors">
        MyMedRecord · Plataforma de gestión y acceso controlado a
        información clínica
      </footer>
    </div>
  );
};
