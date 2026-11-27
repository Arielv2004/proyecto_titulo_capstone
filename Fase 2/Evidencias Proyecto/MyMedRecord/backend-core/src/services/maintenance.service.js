const db = require('../config/db');
const deletions = require('./document-deletion.service');

function startMaintenance() {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await deletions.processDue();
      await db.query('DELETE FROM security_rate_limits WHERE expires_at<NOW()');
      await db.query('DELETE FROM auth_sessions WHERE expires_at < NOW()');
    } catch { console.error('[Mantenimiento] No se completó el ciclo; se reintentará.'); }
    finally { busy = false; }
  };
  const timer = setInterval(tick, 30000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
module.exports = startMaintenance;
