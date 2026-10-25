import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
export function PrivacyControls() {
 const [notice,setNotice]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;api.get('/privacy/notice').then(({data})=>{if(active)setNotice(data.data);}).catch(()=>{if(active)setError('No se pudo consultar el aviso de privacidad.');});return()=>{active=false;};},[]);
 async function accept(){setBusy(true);setError('');try{await api.post('/privacy/notice/accept',{version:notice.version,accepted:true});setNotice({...notice,acceptedAt:new Date().toISOString()});}catch{setError('No se pudo registrar la aceptación.');}finally{setBusy(false);}}
 async function download(){setBusy(true);setError('');try{const {data}=await api.get('/privacy/export',{responseType:'blob'});const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download='mymedrecord-datos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('No se pudo exportar tu información.');}finally{setBusy(false);}}
 return <section className="mm-card space-y-3"><h2 className="font-bold text-ink">Privacidad y mis datos</h2>
 <p className="text-sm text-muted">El OCR se procesa localmente. Compartir por QR requiere que apruebes la consulta. Durante las verificaciones del prototipo utiliza únicamente datos ficticios.</p>
 <Link to="/privacy" className="underline">Leer el aviso de privacidad {notice?.version}</Link>
 {notice && !notice.acceptedAt && <button className="mm-button mm-button--secondary" disabled={busy} onClick={accept}>He leído y acepto este aviso</button>}
 {notice?.acceptedAt && <p className="text-sm text-muted">Aceptación registrada el {new Date(notice.acceptedAt).toLocaleDateString('es-CL')}.</p>}
 <button className="mm-button mm-button--secondary" disabled={busy} onClick={download}>Exportar mis datos</button>
 <p className="text-sm text-muted">Exportación en JSON. Puedes descargar cada archivo original desde Mi ficha.</p>
 {error && <p role="alert">{error}</p>}
 </section>;
}
