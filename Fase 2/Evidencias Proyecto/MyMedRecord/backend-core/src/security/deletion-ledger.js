const fs=require('node:fs');
const path=require('node:path');
const {seal,open}=require('./crypto');
const file=process.env.DELETION_LEDGER_PATH || path.resolve(__dirname,'../../../.private/deletion-ledger.jsonl');
function record(documentId,patientId) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const entry=seal({documentId,patientId,at:new Date().toISOString()},'deletion-ledger');
  const fd=fs.openSync(file,'a',0o600);
  try {fs.writeSync(fd,JSON.stringify(entry)+'\n');fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
}
function entries(required=false) {
  if(!fs.existsSync(file)) {if(required)throw new Error('Falta el registro vigente de eliminaciones.');return [];}
  return fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(line=>open(JSON.parse(line),'deletion-ledger'));
}
module.exports={record,entries};
