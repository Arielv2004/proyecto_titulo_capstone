import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { DoctorHome } from '../components/doctor/DoctorHome';
import { SectionNav, Notice } from '../components/ui/ClinicalUI';

export const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('CLINICAL');
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  async function loadShares() {
    setLoading(true); setError('');
    try { const { data } = await api.get('/access-grants/shared-with-me'); setShares(data.data || []); }
    catch { setError('No fue posible cargar las fichas compartidas.'); }
    finally { setLoading(false); }
  }
  async function loadActivity() {
    setActivityLoading(true); setActivityError('');
    try { const { data } = await api.get('/audit/doctor-activity'); setEvents(data.data || []); }
    catch { setActivityError('No fue posible cargar tu actividad.'); }
    finally { setActivityLoading(false); }
  }
  useEffect(() => { loadShares(); }, []);
  useEffect(() => { if (tab === 'AUDIT') loadActivity(); }, [tab]);
  return <div className="min-h-screen flex flex-col bg-canvas text-body">
    <Navbar roleTitle="Portal Médico" />
    <main id="main-content" tabIndex={-1} className="mm-shell space-y-6">
      <SectionNav value={tab} onChange={setTab} items={[{id:'CLINICAL',label:'Pacientes',icon:Stethoscope},{id:'AUDIT',label:'Mi actividad',icon:ShieldCheck}]} />
      {tab === 'CLINICAL' ? <DoctorHome shares={shares} loading={loading} error={error} onRefresh={loadShares} onOpen={grant => navigate('/shared-record/' + grant.token)} onQr={() => navigate('/doctor/qr-access')} /> :
        <section className="mm-card space-y-4"><div className="flex items-center justify-between"><h1 className="text-xl font-bold">Mi actividad</h1><button className="mm-button mm-button--secondary" onClick={loadActivity} disabled={activityLoading}>Actualizar</button></div>
          {activityLoading ? <p>Consultando actividad…</p> : activityError ? <Notice title="No se pudo cargar la actividad" tone="danger">{activityError}</Notice> : events.length ? <ul className="space-y-3">{events.map(event => <li key={event.id} className="rounded-xl border border-line p-3"><strong>{event.action.replaceAll('_', ' ')}</strong><p className="text-sm text-muted">{new Date(event.created_at).toLocaleString('es-CL')}</p></li>)}</ul> : <p>No hay actividad registrada para tu cuenta.</p>}
        </section>}
    </main>
  </div>;
};
