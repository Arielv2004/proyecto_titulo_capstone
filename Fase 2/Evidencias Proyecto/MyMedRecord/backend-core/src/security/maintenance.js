const db=require('../config/db');
const clinical=require('./clinical-store');
async function erase(documentId) {
  const service=require('../services/document.service');
  const client=await db.pool.connect();
  try {
    await client.query('BEGIN');
    const row=(await client.query("SELECT d.* FROM documents d JOIN document_deletions q ON q.document_id=d.id WHERE d.id=$1 AND d.status='ELIMINADO' AND q.completed_at IS NULL FOR UPDATE OF d,q",[documentId])).rows[0];
    if(!row){await client.query('COMMIT');return true;}
    const removed=await service._removeStoredFile(row.file_path);
    if(removed) {
      await client.query('DELETE FROM prescriptions WHERE document_id=$1',[documentId]);
      await client.query('DELETE FROM lab_reports WHERE document_id=$1',[documentId]);
      const empty=Object.fromEntries(clinical.fields.documents.map(name=>[name,null]));
      await clinical.update('documents',documentId,{...empty,file_path:'deleted',updated_at:new Date()},client);
      await client.query('UPDATE document_deletions SET completed_at=NOW(),attempts=attempts+1 WHERE document_id=$1',[documentId]);
    } else await client.query("UPDATE document_deletions SET attempts=attempts+1,next_attempt_at=NOW()+INTERVAL '1 hour' WHERE document_id=$1",[documentId]);
    await client.query('COMMIT');return removed;
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}
let running=false;
async function run() {
  if(running)return;running=true;
  try {
    const docs=require('../repositories/document.repository');
    for(const row of await docs.findExpiredTemps(24)) await docs.softDelete(row.id);
    const queue=(await db.query('SELECT document_id FROM document_deletions WHERE completed_at IS NULL AND next_attempt_at<=NOW() LIMIT 100')).rows;
    for(const row of queue) await erase(row.document_id);
    await db.query('DELETE FROM auth_sessions WHERE expires_at<NOW()');
    await db.query('DELETE FROM security_rate_limits WHERE expires_at<NOW()');
    await db.query("DELETE FROM qr_consultations WHERE expires_at<NOW() OR (status<>'APPROVED' AND request_expires_at<NOW())");
  } finally{running=false;}
}
function start() {
  const safe=()=>run().catch(()=>console.error('[Mantenimiento] Limpieza pendiente; se reintentará.'));
  safe();const timer=setInterval(safe,3600000);timer.unref();return timer;
}
module.exports={run,erase,start};
