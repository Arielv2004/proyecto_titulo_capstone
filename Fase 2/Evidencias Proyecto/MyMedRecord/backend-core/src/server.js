const app=require('./app');
const config=require('./config/env');
async function start() {
  require('./security/configuration').validateSecurityConfiguration();
  const db=require('./config/db');
  const migration=await db.query("SELECT name FROM schema_migrations WHERE name IN ('001_sensitive_data','002_account_revocation','003_cipher_constraints')");
  if(migration.rowCount!==3) throw new Error('Ejecuta la migración de seguridad antes de iniciar.');
  const role=(await db.query("SELECT rolsuper,has_table_privilege(current_user,'audit_logs','UPDATE') AS can_edit_audit FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(!role || role.rolsuper || role.can_edit_audit) throw new Error('Configura un rol de aplicación limitado.');
  if(process.env.STORAGE_MODE==='supabase') await require('./services/supabase.service').assertPrivate();
  app.listen(config.PORT,()=>console.log('[MyMedRecord] Backend disponible en puerto '+config.PORT));
  require('./security/maintenance').start();
}
start().catch(()=>{console.error('Inicio rechazado: verifica configuración, migraciones y almacenamiento privado.');process.exitCode=1;});
