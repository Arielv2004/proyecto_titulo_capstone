import { useEffect, useState } from 'react';
import api from '../../services/api';
export function QrApprovalRequests() {
  const [requests,setRequests]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(null);
  useEffect(()=>{
    let active=true;
    const load=async()=>{try{const {data}=await api.get('/access-grants/qr/requests');if(active){setRequests(data.data);setError('');}}catch{if(active)setError('No se pudieron consultar las solicitudes QR.');}};
    load();const interval=setInterval(load,5000);
    return ()=>{active=false;clearInterval(interval);};
  },[]);
  async function decide(id,decision) {
    setBusy(id);setError('');
    try {await api.post('/access-grants/qr/requests/'+id+'/decision',{decision});setRequests(current=>current.filter(item=>item.id!==id));}
    catch {setError('La solicitud ya no está disponible o no se pudo responder.');}
    finally{setBusy(null);}
  }
  if(!requests.length && !error) return null;
  return <section className="mm-card space-y-4" aria-label="Solicitudes de consulta QR">
    <div><h2 className="text-lg font-bold text-ink">Solicitudes para consultar tu ficha</h2>
    <p className="text-sm text-muted">Acepta solo a quien estás esperando. Su identidad es declarada y no está verificada. La aprobación permite consultar tu ficha y descargar documentos hasta que venza o revoques este pase.</p></div>
    {error && <p role="alert">{error}</p>}
    {requests.map(item=><div key={item.id} className="rounded-xl border border-line p-4 space-y-3">
      <div><strong>{item.doctorName}</strong><p className="text-sm text-muted">RUT declarado: {item.doctorRut} · {item.doctorInstitution || 'Sin institución declarada'}</p></div>
      <div className="flex flex-wrap gap-3"><button className="mm-button mm-button--primary" disabled={busy===item.id} onClick={()=>decide(item.id,'APPROVED')}>Aprobar consulta</button>
      <button className="mm-button mm-button--secondary" disabled={busy===item.id} onClick={()=>decide(item.id,'REJECTED')}>Rechazar</button></div>
    </div>)}
  </section>;
}
