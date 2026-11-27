const { randomUUID, randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const db = require('../config/db');
const config = require('../config/env');
const fields = {
  patient_profiles: ['birth_date','gender','biological_sex','gender_other','blood_type','health_insurance','is_organ_donor','allergies','chronic_conditions','emergency_contact_name','emergency_contact_phone'],
  documents: ['title','file_name','issuing_doctor','issuing_institution','ocr_raw_text','encrypted_notes'],
  prescriptions: ['doctor_name','diagnosis_code','diagnosis_text','is_chronic'],
  prescription_items: ['medication_name','dosage','frequency','duration','instructions'],
  lab_reports: ['laboratory_name','observations'],
  lab_test_items: ['test_name','result_value','unit','reference_range','is_abnormal'],
  appointments: ['reason'],
};
const required = new Set(['title','file_name','medication_name','test_name','result_value']);
function check(table) { if (!fields[table]) throw new Error('Tabla clínica no permitida.'); }
function key() {
  const value = Buffer.from(config.SECURITY.AES_KEY, 'utf8');
  if (value.length !== 32) throw new Error('La clave clínica debe contener 32 bytes.');
  return value;
}
async function context(table, row, client) {
  let owner = row.user_id || row.patient_id;
  if (!owner && ['prescription_items','lab_test_items'].includes(table)) {
    const parent = table === 'prescription_items' ? 'prescriptions' : 'lab_reports';
    const id = row.prescription_id || row.lab_report_id;
    owner = (await client.query(`SELECT patient_id FROM ${parent} WHERE id=$1`, [id])).rows[0]?.patient_id;
  }
  if (!owner) throw new Error('Registro clínico sin titular.');
  return Buffer.from(`${table}:${row.id}:${owner}`);
}
async function decode(table, row, client = db) {
  check(table);
  if (!row) return null;
  const { encrypted_payload, ...plain } = row;
  if (!encrypted_payload) return plain;
  if (encrypted_payload.v !== 1) throw new Error('Versión de cifrado no válida.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(encrypted_payload.iv, 'base64'));
  decipher.setAAD(await context(table, row, client));
  decipher.setAuthTag(Buffer.from(encrypted_payload.tag, 'base64'));
  const values = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted_payload.data, 'base64')), decipher.final()]).toString('utf8'));
  return { ...plain, ...values };
}
async function encode(table, row, client) {
  const data = { ...row }, payload = {};
  const limits = (await client.query(`SELECT column_name,character_maximum_length FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 AND character_maximum_length IS NOT NULL`, [table])).rows;
  for (const field of fields[table]) {
    let value = row[field] ?? null;
    if (value instanceof Date) value = value.toISOString().slice(0, 10);
    const limit = limits.find(c => c.column_name === field)?.character_maximum_length;
    if (typeof value === 'string' && limit && value.length > limit) throw Object.assign(new Error('Un campo clínico supera la longitud permitida.'), { statusCode: 400 });
    payload[field] = value;
    data[field] = required.has(field) ? '[cifrado]' : null;
  }
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(await context(table, row, client));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  data.encrypted_payload = { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') };
  return data;
}
async function transaction(work, client) {
  if (client && client !== db) return work(client);
  const connection = await db.pool.connect();
  try { await connection.query('BEGIN'); const result = await work(connection); await connection.query('COMMIT'); return result; }
  catch (error) { await connection.query('ROLLBACK'); throw error; }
  finally { connection.release(); }
}
function names(data) {
  const keys = Object.keys(data);
  if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Campo no válido.');
  return keys;
}
async function create(table, values, client) {
  check(table);
  return transaction(async runner => {
    const row = await encode(table, { ...values, id: values.id || randomUUID() }, runner), columns = names(row);
    const result = await runner.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`, columns.map(c => row[c]));
    return decode(table, result.rows[0], runner);
  }, client);
}
async function update(table, id, changes, client) {
  check(table);
  return transaction(async runner => {
    const current = (await runner.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!current) return null;
    const row = await encode(table, { ...await decode(table, current, runner), ...changes, id }, runner);
    const data = { ...changes, encrypted_payload: row.encrypted_payload };
    for (const field of fields[table]) data[field] = row[field];
    const columns = names(data);
    const result = await runner.query(`UPDATE ${table} SET ${columns.map((c,i)=>c+'=$'+(i+1)).join(',')} WHERE id=$${columns.length+1} RETURNING *`, [...columns.map(c=>data[c]), id]);
    return decode(table, result.rows[0], runner);
  }, client);
}
async function hydrate(table, value, client = db) {
  if (Array.isArray(value)) return Promise.all(value.map(row => hydrate(table, row, client)));
  if (!value) return value;
  const id = table === 'patient_profiles' ? (value.profile_id || value.id) : value.id;
  const stored = id ? (await client.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0] : null;
  const result = { ...value };
  if (stored?.encrypted_payload) {
    const plain = await decode(table, stored, client);
    for (const field of fields[table]) if (Object.hasOwn(value, field)) result[field] = plain[field];
  }
  delete result.encrypted_payload;
  if (result.structured) result.structured = await hydrate(result.document_type === 'RECETA' ? 'prescriptions' : 'lab_reports', result.structured, client);
  if (Array.isArray(result.items)) result.items = await hydrate(table === 'prescriptions' ? 'prescription_items' : 'lab_test_items', result.items, client);
  return result;
}
function reads(repository, mapping) {
  for (const [name, table] of Object.entries(mapping)) {
    const original = repository[name];
    repository[name] = async function (...args) {
      const client = args.at(-1)?.query ? args.at(-1) : db;
      return hydrate(table, await original.apply(this, args), client);
    };
  }
}
module.exports = { fields, create, update, hydrate, decode, reads, transaction };
