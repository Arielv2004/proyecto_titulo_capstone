import { useEffect, useState } from 'react';
import api from '../../services/api';
import { validateRut } from '../../utils/rutValidator';
import { ClinicalRecord } from './ClinicalRecord';
import { openDocumentBlob, prepareDocumentWindow } from '../../services/documentsApi';

export function VisitorQrConsultation({ id, onClose }) {
  const endpoint = '/access-grants/qr/visitor/' + encodeURIComponent(id);
  const [identifying, setIdentifying] = useState(false);
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [institution, setInstitution] = useState('');
  const [sending, setSending] = useState(false);
  const [record, setRecord] = useState(null);
  const [minutes, setMinutes] = useState(null);
  const [message, setMessage] = useState('Comprobando el estado del pase…');
  const [opening, setOpening] = useState(null);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    let active = true;
    let timer;
    let loaded = false;
    let running = false;
    async function refresh() {
      if (!active || running) return;
      clearTimeout(timer);
      running = true;
      let retry = true;
      try {
        const { data: { data } } = await api.get(endpoint + '/status');
        if (!active) return;
        setIdentifying(data.status === 'IDENTIFYING');
        if (data.status === 'IDENTIFYING') {
          setMessage('El pase quedó reservado para este navegador. Tienes cinco minutos para identificarte.');
        } else if (data.status === 'APPROVED') {
          if (!loaded) {
            const res = await api.get(endpoint + '/record');
            if (!active) return;
            setRecord(res.data.data.clinicalData);
            loaded = true;
          }
          setMinutes(Math.max(0, Math.ceil((Date.parse(data.expiresAt) - Date.now()) / 60000)));
        } else if (data.status === 'REJECTED') {
          setMessage('El paciente rechazó esta consulta. Para volver a solicitarla necesitas otro pase.');
          retry = false;
        } else {
          setMessage('Esperando aprobación del paciente. La solicitud caduca en cinco minutos.');
        }
      } catch (err) {
        if (!active) return;
        loaded = false;
        setIdentifying(false);
        setRecord(null);
        setMessage(err.response?.data?.message || 'No se pudo comprobar el permiso. Reintentando…');
        retry = ![403, 404, 410].includes(err.response?.status);
      } finally {
        running = false;
        if (active && retry) timer = setTimeout(refresh, loaded ? 5000 : 2000);
      }
    }
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; clearTimeout(timer); window.removeEventListener('focus', refresh); };
  }, [endpoint]);

  async function openFile(documentId) {
    const tab = prepareDocumentWindow();
    setOpening(documentId);
    setFileError('');
    try {
      const { data } = await api.get(endpoint + '/documents/' + documentId, { responseType: 'blob' });
      openDocumentBlob(data, tab);
    } catch (err) {
      tab?.close();
      if ([403, 410].includes(err.response?.status)) {
        setRecord(null);
        setMessage('El permiso dejó de estar vigente.');
      } else setFileError('No se pudo abrir el archivo.');
    } finally { setOpening(null); }
  }
  async function identify(event) {
    event.preventDefault();
    if (sending) return;
    if (!validateRut(rut) || name.trim().length < 2) {
      setFileError('Ingresa tu nombre y un RUT válido.');
      return;
    }
    if (!institution.trim()) {
      setFileError('Ingresa el nombre de tu centro de salud.');
      return;
    }
    setSending(true);
    setFileError('');
    try {
      await api.post(endpoint + '/identify', { name: name.trim(), rut: rut.trim(), institution: institution.trim() });
      setIdentifying(false);
      setMessage('Esperando aprobación del paciente. La solicitud caduca en cinco minutos.');
    } catch (err) {
      setFileError(err.response?.data?.message || 'No se pudo enviar la solicitud.');
    } finally { setSending(false); }
  }
  async function finish() {
    try {
      await api.post(endpoint + '/end');
      onClose();
    } catch { setFileError('No se pudo finalizar la consulta. Intenta nuevamente.'); }
  }
  if (record) return <ClinicalRecord data={record} timeLeft={minutes} onFinish={finish} onOpenFile={openFile} fileError={fileError} openingFileId={opening} backLabel="Volver al escáner" />;
  return <main className="mm-shell py-8" id="main-content"><section className="mm-card space-y-4">
    <h1 className="text-xl font-bold text-ink">Consulta por QR</h1>
    <p role="status">{message}</p>
    {identifying && <form onSubmit={identify} className="space-y-3">
      <p className="text-sm text-muted">El paciente verá estos datos declarados y decidirá si te da acceso.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm font-bold">Nombre y apellido
          <input required maxLength={150} autoComplete="name" placeholder="Camila González" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2" />
        </label>
        <label className="text-sm font-bold">RUT
          <input required maxLength={12} placeholder="12.345.678-5" value={rut} onChange={e => setRut(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2" />
        </label>
        <label className="text-sm font-bold sm:col-span-2">Centro de salud
          <input required maxLength={200} autoComplete="organization" placeholder="CESFAM Los Aromos" value={institution} onChange={e => setInstitution(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2" />
        </label>
      </div>
      <button className="mm-button mm-button--primary" disabled={sending}>Solicitar acceso al paciente</button>
    </form>}
    {fileError && <p role="alert">{fileError}</p>}
    <button className="mm-button mm-button--secondary" onClick={finish}>Cerrar consulta</button>
  </section></main>;
}
