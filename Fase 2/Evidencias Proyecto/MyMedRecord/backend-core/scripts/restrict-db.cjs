const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),dotenv=require('dotenv'),{Pool}=require('pg');
const root=path.resolve(__dirname,'..'), envPath=path.join(root,'.env');
const admin=dotenv.parse(fs.readFileSync(path.resolve(root,'../.private/admin.env')));
const pool=new Pool({host:admin.DB_HOST||'localhost',port:Number(admin.DB_PORT||5432),user:admin.DB_USER,password:admin.DB_PASSWORD,database:admin.DB_NAME||'mymedrecord'});
(async()=>{
 const password=crypto.randomBytes(32).toString('hex');
 await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='mymedrecord_app') THEN CREATE ROLE mymedrecord_app LOGIN; END IF; END $$");
 await pool.query("ALTER ROLE mymedrecord_app WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '"+password+"'");
 await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
 await pool.query('GRANT USAGE ON SCHEMA public TO mymedrecord_app');
 await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO mymedrecord_app');
 await pool.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO mymedrecord_app');
 await pool.query('REVOKE UPDATE,DELETE,TRUNCATE ON audit_logs FROM mymedrecord_app');
 await pool.query('REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON schema_migrations FROM mymedrecord_app');
 let env=fs.readFileSync(envPath,'utf8');
 for(const [key,value] of Object.entries({DB_USER:'mymedrecord_app',DB_PASSWORD:password})){
  const re=new RegExp('^'+key+'=.*$','m');env=re.test(env)?env.replace(re,key+'='+value):env+'\n'+key+'='+value;
 }
 fs.writeFileSync(envPath,env);
 console.log('Usuario de aplicación limitado configurado; auditoría solo lectura/inserción.');
})().catch(()=>{console.error('No se pudo configurar el rol.');process.exitCode=1;}).finally(()=>pool.end());
