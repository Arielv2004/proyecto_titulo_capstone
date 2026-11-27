import { useEffect, useState } from 'react';
import api from '../../services/api';

export function QrApprovalRequests() {
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const endpoint = '/access-grants/qr/visitor';

  useEffect(() => {
    let active = true;
    let timer;
    async function load() {
      try {
        const { data } = await api.get(endpoint + '/requests');
        if (active) { setRequests(data.data); setLoadFailed(false); }
      } catch {
        if (active) setLoadFailed(true);
      } finally {
        if (active) timer = setTimeout(load, 3000);
      }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  async function decide(id, decision) {
    setBusy(true);
    setError('');
    try {
      await api.post(endpoint + '/' + id + '/decision', { decision });
      setRequests(items => items.filter(item => item.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo responder a la solicitud.');
    } finally { setBusy(false); }
  }

  if (!requests.length && !error && !loadFailed) return null;
  return <section className="mm-card space-y-3" aria-label="Solicitudes de visitantes por QR">
    <h2 className="font-bold text-ink">Solicitudes de acceso por QR</h2>
    {(error || loadFailed) && <p role="alert">{error || 'No se pudieron cargar las solicitudes QR.'}</p>}
    {requests.map(({ id, name, rut, institution }) => <div key={id} className="space-y-2">
      <p><strong>{name}</strong> · RUT declarado {rut}</p>
      {institution && <p className="text-sm break-words">Centro de salud declarado: {institution}</p>}
      <p className="text-sm text-muted">Esta persona ingresó sus datos sin cuenta. Si la reconoces, puedes permitirle consultar tu ficha y abrir tus documentos hasta que venza o revoques el pase.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="mm-button mm-button--primary" disabled={busy} onClick={() => decide(id, 'APPROVED')}>Aprobar consulta</button>
        <button type="button" className="mm-button mm-button--secondary" disabled={busy} onClick={() => decide(id, 'REJECTED')}>Rechazar</button>
      </div>
    </div>)}
  </section>;
}
