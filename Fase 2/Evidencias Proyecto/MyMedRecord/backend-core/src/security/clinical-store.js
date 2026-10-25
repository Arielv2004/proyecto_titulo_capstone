const crypto = require('node:crypto');
const db = require('../config/db');
const { seal, open } = require('./crypto');
const fields = {
  appointments: ['reason'],
  patient_profiles: ['birth_date','gender','blood_type','health_insurance','is_organ_donor','allergies','chronic_conditions','emergency_contact_name','emergency_contact_phone'],
  documents: ['title','file_name','issuing_doctor','issuing_institution','ocr_raw_text','encrypted_notes'],
  prescriptions: ['doctor_name','diagnosis_code','diagnosis_text','is_chronic'],
  prescription_items: ['medication_name','dosage','frequency','duration','instructions'],
  lab_reports: ['laboratory_name','observations'],
  lab_test_items: ['test_name','result_value','unit','reference_range','is_abnormal'],
};
const required = new Set(['title','file_name','medication_name','test_name','result_value']);
function check(table) { if (!fields[table]) throw new Error('Tabla clínica no permitida.'); }
async function owner(table, row, client) {
  if (table === 'patient_profiles') return row.user_id;
  if (row.patient_id) return row.patient_id;
  const parent = table === 'prescription_items' ? 'prescriptions' : 'lab_reports';
  const id = row.prescription_id || row.lab_report_id;
  const result = await client.query(`SELECT patient_id FROM ${parent} WHERE id=$1`, [id]);
  if (!result.rows[0]) throw new Error('Registro clínico sin paciente.');
  return result.rows[0].patient_id;
}
async function decode(table, row, client = db) {
  check(table);
  if (!row) return null;
  const { encrypted_payload, ...result } = row;
  if (encrypted_payload) {
    const values = open(encrypted_payload, `${table}:${row.id}:${await owner(table,row,client)}`);
    for (const field of fields[table]) if (Object.hasOwn(values, field)) result[field] = values[field];
  }
  return result;
}
async function encode(table, row, client) {
  check(table);
  const result = { ...row };
  const payload = {};
  for (const field of fields[table]) {
    payload[field] = row[field] ?? null;
    result[field] = required.has(field) ? '[cifrado]' : null;
  }
  result.encrypted_payload = seal(payload, `${table}:${row.id}:${await owner(table,row,client)}`);
  return result;
}
function identifiers(data) {
  const names = Object.keys(data);
  if (names.some((key) => !/^[a-z_]+$/.test(key))) throw new Error('Campo no válido.');
  return names;
}
async function create(table, data, client = db) {
  check(table);
  const row = { ...data, id: data.id || crypto.randomUUID() };
  const encoded = await encode(table, row, client);
  const names = identifiers(encoded);
  const result = await client.query(`INSERT INTO ${table} (${names.join(',')}) VALUES(${names.map((_,i)=>`$${i+1}`).join(',')}) RETURNING *`, names.map((key)=>encoded[key]));
  return decode(table,result.rows[0],client);
}
async function update(table, id, changes, client) {
  check(table);
  client = client || db.currentClient();
  if (!client) {
    const connection = await db.pool.connect();
    try { await connection.query('BEGIN'); const result = await update(table,id,changes,connection); await connection.query('COMMIT'); return result; }
    catch (error) { await connection.query('ROLLBACK'); throw error; }
    finally { connection.release(); }
  }
  const current = (await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [id])).rows[0];
  if (!current) return null;
  const plain = await decode(table,current,client);
  const encoded = await encode(table,{ ...plain,...changes,id },client);
  const data = { ...changes, encrypted_payload: encoded.encrypted_payload };
  for (const field of fields[table]) data[field] = encoded[field];
  const names = identifiers(data);
  const result = await client.query(`UPDATE ${table} SET ${names.map((key,i)=>`${key}=$${i+1}`).join(',')} WHERE id=$${names.length+1} RETURNING *`, [...names.map((key)=>data[key]), id]);
  return decode(table,result.rows[0],client);
}
module.exports = { fields, decode, encode, create, update };
