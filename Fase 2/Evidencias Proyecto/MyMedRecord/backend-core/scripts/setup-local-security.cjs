const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const local = path.join(root, '.private');
fs.mkdirSync(local, { recursive: true });
if(!fs.existsSync(path.join(local,'deletion-ledger.jsonl')))fs.writeFileSync(path.join(local,'deletion-ledger.jsonl'),'');
const envPath = path.join(root, 'backend-core/.env');
if (!fs.existsSync(path.join(local,'admin.env'))) fs.copyFileSync(envPath,path.join(local,'admin.env'));
let env = fs.readFileSync(envPath,'utf8');
function set(name,value) { env = env.replace(new RegExp(`^${name}=.*(?:\\r?\\n|$)`,'gm'),''); env += `\n${name}=${value}\n`; }
const read = (name) => env.match(new RegExp(`^${name}=(.*)$`,'m'))?.[1]?.trim();
if (!read('CLINICAL_ACTIVE_KEY') || !read('CLINICAL_ENCRYPTION_KEYS') || read('CLINICAL_ENCRYPTION_KEYS')==='{}') {
  set('CLINICAL_ACTIVE_KEY','v1');
  set('CLINICAL_ENCRYPTION_KEYS',JSON.stringify({ v1: crypto.randomBytes(32).toString('base64') }));
}
for (const key of ['CSRF_SECRET','AI_SERVICE_TOKEN']) if (!read(key)) set(key,crypto.randomBytes(32).toString('hex'));
set('STORAGE_MODE','supabase');
fs.writeFileSync(envPath,env);
const aiPath = path.join(root,'ai-service/.env');
let ai = (fs.existsSync(aiPath)?fs.readFileSync(aiPath,'utf8'):'').replace(/^AI_SERVICE_TOKEN=.*(?:\r?\n|$)/gm,'').replace(/^EXTERNAL_AI_ENABLED=.*(?:\r?\n|$)/gm,'').replace(/^HOST=.*(?:\r?\n|$)/gm,'');
ai += `\nAI_SERVICE_TOKEN=${read('AI_SERVICE_TOKEN')}\nEXTERNAL_AI_ENABLED=false\nHOST=127.0.0.1\n`;
fs.writeFileSync(aiPath,ai);
console.log('Configuración local de seguridad preparada. No se muestran secretos.');
