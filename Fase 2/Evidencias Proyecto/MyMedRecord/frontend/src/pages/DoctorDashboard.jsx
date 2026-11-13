import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck, User } from 'lucide-react';
import api from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { DoctorHome } from '../components/doctor/DoctorHome';
import { SectionNav, Notice, InfoPopover } from '../components/ui/ClinicalUI';

function usePortalList(path, enabled, errorMessage) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let inFlight = false;
    setLoading(true);
    setError('');

    async function refresh() {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const { data } = await api.get(path, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setItems(data.data || []);
          setError('');
        }
      } catch {
        if (!controller.signal.aborted) setError(errorMessage);
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [path, enabled, errorMessage]);

  return { items, error, loading };
}

export const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('CLINICAL');
  const { items: shares, loading, error } = usePortalList(
    '/access-grants/shared-with-me', tab === 'CLINICAL', 'No fue posible cargar las fichas compartidas.'
  );
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const { items: events, loading: activityLoading, error: activityError } = usePortalList(
    '/audit/doctor-activity', tab === 'AUDIT', 'No fue posible cargar tu actividad.'
  );
  useEffect(() => {
    if (tab !== 'PROFILE') return;
    let active = true;
    setProfile(null); setProfileError('');
    api.get('/doctors/me').then(({ data }) => {
      if (active) {
        if (data.data) setProfile(data.data);
        else setProfileError('No se encontró tu perfil profesional.');
      }
    }).catch(() => { if (active) setProfileError('No se pudo cargar tu perfil profesional.'); });
    return () => { active = false; };
  }, [tab]);
  return <div className="min-h-screen flex flex-col bg-canvas text-body">
    <Navbar roleTitle="Portal Médico" onOpenProfile={() => setTab('PROFILE')} />
    <main id="main-content" tabIndex={-1} className="mm-shell space-y-6">
      <SectionNav value={tab} onChange={setTab} items={[{id:'CLINICAL',label:'Pacientes',icon:Stethoscope},{id:'AUDIT',label:'Mi actividad',icon:ShieldCheck},{id:'PROFILE',label:'Mi perfil',icon:User}]} />
      {tab === 'CLINICAL' ? <DoctorHome shares={shares} loading={loading} error={error} onOpen={grant => { if (grant.status === 'ACTIVO' && !grant.isRevoked && grant.token) navigate('/shared-record/' + grant.token); }} /> : tab === 'PROFILE' ? <section className="mm-card space-y-4">
        <h1 className="text-xl font-bold">Mi perfil profesional</h1>
        {profileError ? <Notice title="No se pudo cargar el perfil" tone="danger">{profileError}</Notice> : !profile ? <p>Cargando perfil…</p> :
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Nombre', [profile.first_name, profile.last_name].filter(Boolean).join(' ')],
              ['RUT', profile.rut], ['Correo', profile.email],
              ['Registro profesional', profile.professional_registry], ['Especialidad', profile.specialty],
              ['Institución', profile.institution_name], ['Región', profile.region_code ? `Código ${profile.region_code}` : null],
              ['Ciudad o comuna', profile.city], ['Dirección', profile.address], ['Estado de verificación', profile.verification_status],
              ['Disponible para recibir fichas', profile.is_available_for_sharing == null ? null : profile.is_available_for_sharing ? 'Sí' : 'No']
            ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="font-semibold">{value || 'No informado'}</dd></div>)}
          </dl>}
      </section> :
        <section className="mm-card space-y-4"><div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Mi actividad</h1><p className="text-sm text-muted">Consultas y cambios en los accesos compartidos contigo.</p></div>
          <InfoPopover label="Qué aparece en Mi actividad">
            <p>Aquí puedes ver cuándo un paciente comparte o revoca tu acceso y cuándo consultas una ficha o abres un documento. La lista se actualiza automáticamente.</p>
          </InfoPopover>
          </div>
          {activityLoading ? <p>Consultando actividad…</p> : activityError ? <Notice title="No se pudo cargar la actividad" tone="danger">{activityError}</Notice> : events.length ? <ul className="space-y-3">{events.map(event => <li key={event.id} className="rounded-xl border border-line p-3"><strong>{({CONSULTA_MEDICA_QR:'Consulta mediante QR', CONSULTA_MEDICA_DIRECTA:'Consulta de ficha compartida', VIEW_SHARED_DOCUMENT:'Apertura de documento', SHARE_RECORD_WITH_DOCTOR:'Ficha compartida contigo', REVOKE_DIRECT_ACCESS:'Acceso revocado por el paciente'})[event.action] || event.action.replaceAll('_', ' ')}</strong><p className="text-sm text-muted">{new Date(event.created_at).toLocaleString('es-CL')}{event.patient_first_name && ` · Paciente: ${event.patient_first_name} ${event.patient_last_name || ''}`}</p></li>)}</ul> : <p>No hay actividad registrada para tu cuenta.</p>}
        </section>}
    </main>
  </div>;
};
