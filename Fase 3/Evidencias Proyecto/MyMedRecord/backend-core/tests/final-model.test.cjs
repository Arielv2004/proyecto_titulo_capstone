// Pruebas de integración contra PostgreSQL real en una base efímera exclusiva.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ quiet: true });
const name = 'mmr_model_' + randomUUID().replaceAll('-', '');
const container = process.env.QA_DB_CONTAINER || 'mymedrecord_db';
process.env.DB_NAME = name;
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.JWT_SECRET = randomUUID();
const db = require('../src/config/db');
const migrate = require('../scripts/migrate.cjs');
const bcrypt = require('bcryptjs');
const password = 'PacienteFicticio2026!';
let server, base, patient, doctor, created = false;
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];
async function call(route, method = 'GET', body, cookie) {
  return fetch(base + '/api/v1' + route, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function login(user = patient) {
  const response = await call('/auth/login', 'POST', { email: user.email, password });
  assert.equal(response.status, 200, await response.clone().text());
  return cookieOf(response);
}
async function document(owner = patient, filePath = path.resolve(__dirname, '../uploads/model-absent.txt')) {
  return (await db.query(`INSERT INTO documents(patient_id,uploaded_by,document_type,title,file_name,file_path,mime_type,status)
    VALUES($1,$1,'OTRO','Documento ficticio','model.txt',$2,'text/plain','CONFIRMADO') RETURNING *`, [owner.id, filePath])).rows[0];
}
before(async () => {
  execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', '-O', process.env.DB_USER || 'postgres', name], { windowsHide: true });
  created = true;
  const init = await fs.readFile(path.resolve(__dirname, '../../database/init.sql'), 'utf8');
  // Reproduce la actualización de una base previa de 14 tablas.
  await db.query(init.split('-- Modelo operativo consolidado')[0]);
  assert.equal(Number((await db.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count), 14);
  await db.query('CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64),applied_at TIMESTAMPTZ DEFAULT NOW())');
  await migrate();
  await db.query("UPDATE users SET password_hash=$1", [await bcrypt.hash(password, 10)]);
  patient = (await db.query("SELECT id,email FROM users WHERE role='PACIENTE' LIMIT 1")).rows[0];
  doctor = (await db.query("SELECT id,email FROM users WHERE role='MEDICO' LIMIT 1")).rows[0];
  const app = require('../src/app');
  const rateLimit = require('../src/middlewares/rate-limit.middleware');
  app.post('/model-qa-rate-limit', rateLimit({ scope: 'qa-model', max: 2, windowSeconds: 30 }), (req, res) => res.sendStatus(204));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await db.pool.end();
  if (created) execFileSync('docker', ['exec', container, 'dropdb', '-U', 'postgres', name], { windowsHide: true });
});

test('MOD-01 | Migración 14 a 18 idempotente, sin registro persistente', async () => {
  const snapshot = await db.query('SELECT id,email FROM users ORDER BY id');
  await migrate();
  assert.deepEqual((await db.query('SELECT id,email FROM users ORDER BY id')).rows, snapshot.rows);
  assert.equal(Number((await db.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count), 18);
  assert.equal((await db.query("SELECT to_regclass('public.schema_migrations') AS registry")).rows[0].registry, null);
});

test('MOD-02 | Dos sesiones distintas; solo se almacenan hashes', async () => {
  const a = await login(), b = await login();
  assert.notEqual(a, b);
  const { rows } = await db.query('SELECT token_hash FROM auth_sessions WHERE user_id=$1', [patient.id]);
  assert.ok(rows.length >= 2);
  assert.ok(rows.every(r => /^[a-f0-9]{64}$/.test(r.token_hash) && !a.includes(r.token_hash)));
});

test('MOD-03 | Logout revoca la cookie capturada y conserva otra sesión', async () => {
  const a = await login(), b = await login();
  assert.equal((await call('/auth/logout', 'POST', {}, a)).status, 200);
  assert.equal((await call('/auth/me', 'GET', null, a)).status, 401);
  assert.equal((await call('/auth/me', 'GET', null, b)).status, 200);
});

test('MOD-04 | Sesión vencida, JWT sin sesión y rol distinto son rechazados', async () => {
  const a = await login();
  await db.query("UPDATE auth_sessions SET created_at=NOW()-INTERVAL '2 days',expires_at=NOW()-INTERVAL '1 day' WHERE token_hash=$1", [createHash('sha256').update(a.split('=')[1]).digest('hex')]);
  assert.equal((await call('/auth/me', 'GET', null, a)).status, 401);
  const token = require('jsonwebtoken').sign({ id: patient.id, role: 'PACIENTE' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await call('/auth/me', 'GET', null, 'mymedrecord_session=' + token)).status, 401);
  const docCookie = await login(doctor);
  assert.equal((await call('/patient-profile/me', 'PUT', { biologicalSex: 'FEMENINO' }, docCookie)).status, 403);
});

test('MOD-05 | Reset de contraseña revoca todas las sesiones y consume el enlace', async () => {
  const a = await login(), b = await login();
  const token = require('node:crypto').randomBytes(32).toString('hex');
  await db.query("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')", [patient.id, createHash('sha256').update(token).digest('hex')]);
  const response = await call('/auth/reset-password', 'POST', { token, password });
  assert.equal(response.status, 200, await response.text());
  assert.equal((await call('/auth/me', 'GET', null, a)).status, 401);
  assert.equal((await call('/auth/me', 'GET', null, b)).status, 401);
  assert.equal((await call('/auth/reset-password', 'POST', { token, password })).status, 400);
  assert.equal((await call('/auth/me', 'GET', null, await login())).status, 200);
});

test('MOD-06 | Registro almacena aceptación real y eliminación limpia sesiones y aceptación', async () => {
  const response = await call('/auth/register', 'POST', { rut: '76123456-0', firstName: 'Cuenta', lastName: 'Ficticia', email: 'modelo@example.test', password, role: 'PACIENTE', acceptedTerms: true });
  assert.equal(response.status, 201, await response.clone().text());
  const user = (await response.json()).data.user;
  const acceptance = await db.query('SELECT version,accepted_at FROM privacy_acceptances WHERE user_id=$1', [user.id]);
  assert.equal(acceptance.rowCount, 1);
  assert.ok(acceptance.rows[0].accepted_at);
  const UserService = require('../src/services/user.service');
  const doc = await document(user);
  const Deletions = require('../src/services/document-deletion.service');
  const job = await Deletions.enqueue(doc);
  const result = await UserService.deleteAccount(user.id, { confirmation: 'ELIMINAR', password, ipAddress: '127.0.0.1' });
  assert.equal(result.failedFilesCount, 0);
  assert.equal((await db.query('SELECT 1 FROM privacy_acceptances WHERE user_id=$1', [user.id])).rowCount, 0);
  assert.equal((await db.query('SELECT 1 FROM auth_sessions WHERE user_id=$1', [user.id])).rowCount, 0);
  const saved = (await db.query('SELECT * FROM document_deletions WHERE id=$1', [job])).rows[0];
  assert.equal(saved.patient_id, null);
  assert.equal(saved.document_id, null);
  assert.ok(saved.completed_at);
  assert.equal(saved.storage_path_cipher, null);
  assert.equal((await call('/auth/me', 'GET', null, cookieOf(response))).status, 401);
});

test('MOD-07 | Límite concurrente persistido y recuperación tras caducidad', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => fetch(base + '/model-qa-rate-limit', { method: 'POST' })));
  assert.equal(results.filter(r => r.status === 204).length, 2);
  assert.equal(results.filter(r => r.status === 429).length, 6);
  assert.ok(results.find(r => r.status === 429).headers.get('retry-after'));
  await db.query("UPDATE security_rate_limits SET expires_at=NOW()-INTERVAL '1 second'");
  assert.equal((await fetch(base + '/model-qa-rate-limit', { method: 'POST' })).status, 204);
});

test('MOD-08 | Fallo de storage conserva tarea cifrada, reintento la completa', async () => {
  const doc = await document();
  const Deletions = require('../src/services/document-deletion.service');
  const id = await Deletions.enqueue(doc);
  assert.equal(await Deletions.processJob(id, async () => false), false);
  let saved = (await db.query('SELECT * FROM document_deletions WHERE id=$1', [id])).rows[0];
  assert.equal(saved.attempts, 1);
  assert.equal(saved.completed_at, null);
  assert.ok(!saved.storage_path_cipher.includes('model-absent'));
  assert.ok(saved.next_attempt_at > new Date());
  assert.equal(await Deletions.processJob(id, async p => p === doc.file_path), true);
  saved = (await db.query('SELECT * FROM document_deletions WHERE id=$1', [id])).rows[0];
  assert.equal(saved.attempts, 2);
  assert.ok(saved.completed_at);
  assert.equal(saved.storage_path_cipher, null);
});

test('MOD-09 | Eliminación real de archivo ficticio y bloqueo de rutas externas', async () => {
  const file = path.resolve(__dirname, '../uploads/model-' + randomUUID() + '.txt');
  await fs.writeFile(file, 'archivo ficticio');
  const doc = await document(patient, file);
  const Deletions = require('../src/services/document-deletion.service');
  assert.equal(await Deletions.schedule(doc), true);
  await assert.rejects(fs.access(file));
  assert.equal((await db.query('SELECT status FROM documents WHERE id=$1', [doc.id])).rows[0].status, 'ELIMINADO');
  const outside = path.resolve(__dirname, 'model-' + randomUUID() + '.txt');
  try {
    await fs.writeFile(outside, 'no se debe eliminar');
    const forbidden = await document(patient, outside);
    assert.equal(await Deletions.schedule(forbidden), false);
    await fs.access(outside);
  } finally { await fs.unlink(outside); }
});

test('MOD-10 | La cola pendiente sobrevive a eliminar cuenta y documento', async () => {
  const owner = (await db.query(`INSERT INTO users(rut,first_name,last_name,email,password_hash,role)
    VALUES('76086428-5','Cola','Ficticia','cola@example.test',$1,'PACIENTE') RETURNING id`, [await bcrypt.hash(password, 10)])).rows[0];
  const doc = await document(owner);
  const Deletions = require('../src/services/document-deletion.service');
  const result = await require('../src/repositories/user-data.repository').executeAccountDeletion({
    userId: owner.id, auditDetails: { subject_hash: 'fixture' }, ipAddress: '127.0.0.1',
  });
  assert.equal(result.deletionJobs.length, 1);
  const id = result.deletionJobs[0];
  assert.equal(await Deletions.processJob(id, async () => false), false);
  const pending = (await db.query('SELECT * FROM document_deletions WHERE id=$1', [id])).rows[0];
  assert.equal(pending.patient_id, null);
  assert.equal(pending.document_id, null);
  assert.equal(pending.completed_at, null);
  assert.ok(pending.storage_path_cipher);
  assert.equal(await Deletions.processJob(id, async value => value === doc.file_path), true);
});

test('MOD-11 | Instalación nueva produce el mismo esquema de 18 tablas', async () => {
  const fresh = 'mmr_model_' + randomUUID().replaceAll('-', '');
  const { Client } = require('pg');
  const config = require('../src/config/env');
  execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', '-O', config.DB.USER, fresh], { windowsHide: true });
  const client = new Client({ host: config.DB.HOST, port: config.DB.PORT, user: config.DB.USER, password: config.DB.PASSWORD, database: fresh });
  try {
    await client.connect();
    await client.query(await fs.readFile(path.resolve(__dirname, '../../database/init.sql'), 'utf8'));
    const query = "SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position";
    assert.deepEqual((await client.query(query)).rows, (await db.query(query)).rows);
    assert.equal((await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount, 18);
  } finally {
    await client.end();
    execFileSync('docker', ['exec', container, 'dropdb', '-U', 'postgres', fresh], { windowsHide: true });
  }
});

test('MOD-12 | Confirmaciones simultáneas producen una receta y un rechazo controlado', async () => {
  const service = require('../src/services/document.service');
  const doc = await document();
  await db.query("UPDATE documents SET status='TEMP',document_type='RECETA' WHERE id=$1", [doc.id]);
  const params = { tempId: doc.id, user: { ...patient, role: 'PACIENTE' }, wasReviewed: true,
    editedData: { document_type: 'RECETA', medications: [{ name: 'Medicamento ficticio', dosage: 'dato de prueba' }] } };
  const result = await Promise.allSettled([service.confirmDocument(params), service.confirmDocument(params)]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(result.find(r => r.status === 'rejected').reason.statusCode, 404);
  assert.equal((await db.query('SELECT * FROM prescriptions WHERE document_id=$1', [doc.id])).rowCount, 1);
});

test('MOD-13 | Error al guardar un ítem revierte estado, receta y auditoría de confirmación', async () => {
  const service = require('../src/services/document.service');
  const doc = await document();
  await db.query("UPDATE documents SET status='TEMP',document_type='RECETA' WHERE id=$1", [doc.id]);
  await assert.rejects(service.confirmDocument({ tempId: doc.id, user: { ...patient, role: 'PACIENTE' }, wasReviewed: true,
    editedData: { document_type: 'RECETA', medications: [{ name: 'x'.repeat(1000) }] } }));
  assert.equal((await db.query('SELECT status FROM documents WHERE id=$1', [doc.id])).rows[0].status, 'TEMP');
  assert.equal((await db.query('SELECT * FROM prescriptions WHERE document_id=$1', [doc.id])).rowCount, 0);
  assert.equal((await db.query("SELECT 1 FROM audit_logs WHERE action='CONFIRM_DOCUMENT' AND details->>'documentId'=$1", [doc.id])).rowCount, 0);
});

test('MOD-14 | Perfil cifrado mantiene sexo, género, fecha y antecedentes al consultar', async () => {
  const cookie = await login();
  const response = await call('/patient-profile/me', 'PUT', {
    biologicalSex: 'FEMENINO', gender: 'OTRA_IDENTIDAD', genderOther: 'Identidad ficticia', birthDate: '1995-06-15',
    bloodType: 'O+', healthInsurance: 'FONASA Tramo B', allergies: ['Alergia ficticia'], chronicConditions: ['Antecedente ficticio'],
  }, cookie);
  assert.equal(response.status, 200, await response.clone().text());
  const read = await call('/patient-profile/me', 'GET', null, cookie);
  const data = await read.json();
  assert.ok(JSON.stringify(data).includes('Alergia ficticia'));
  assert.ok(JSON.stringify(data).includes('1995-06-15'));
  const stored = (await db.query('SELECT * FROM patient_profiles WHERE user_id=$1', [patient.id])).rows[0];
  assert.equal(stored.birth_date, null);
  assert.equal(stored.allergies, null);
  assert.equal(stored.biological_sex, null);
  assert.ok(stored.encrypted_payload?.data);
  assert.ok(!JSON.stringify(stored).includes('Alergia ficticia'));
});

test('MOD-15 | Receta cifrada se consulta y edita sin perder la información original', async () => {
  const service = require('../src/services/document.service');
  const doc = await document();
  await db.query("UPDATE documents SET status='TEMP',document_type='RECETA' WHERE id=$1", [doc.id]);
  const user = { ...patient, role: 'PACIENTE' };
  await service.confirmDocument({ tempId: doc.id, user, editedData: { document_type: 'RECETA', title: 'Receta confidencial QA',
    medications: [{ name: 'Medicamento confidencial QA', dosage: 'dosis ficticia' }] } });
  const raw = (await db.query('SELECT title,encrypted_payload FROM documents WHERE id=$1', [doc.id])).rows[0];
  assert.equal(raw.title, '[cifrado]');
  await service.updateDocument(doc.id, user, { title: 'Receta editada QA' });
  const read = await service.getDocumentById(doc.id, user);
  assert.equal(read.title, 'Receta editada QA');
  assert.equal(read.structured.items[0].medication_name, 'Medicamento confidencial QA');
  const records = await require('../src/repositories/clinical-record.repository').findPrescriptions(patient.id);
  assert.ok(records.some(r => r.items.some(i => i.medication_name === 'Medicamento confidencial QA')));
});

test('MOD-16 | Laboratorio cifrado se edita y conserva resultados y observaciones', async () => {
  const service = require('../src/services/document.service');
  const doc = await document();
  await db.query("UPDATE documents SET status='TEMP',document_type='EXAMEN_LAB' WHERE id=$1", [doc.id]);
  const user = { ...patient, role: 'PACIENTE' };
  await service.confirmDocument({ tempId: doc.id, user, editedData: { document_type: 'EXAMEN_LAB',
    lab_metrics: [{ test_name: 'Parametro ficticio', result_value: '94', unit: 'unidad QA' }] } });
  await service.updateDocument(doc.id, user, { observations: 'Observacion confidencial QA',
    labMetrics: [{ name: 'Parametro editado QA', value: '95', unit: 'unidad QA' }] });
  const read = await service.getDocumentById(doc.id, user);
  assert.equal(read.structured.observations, 'Observacion confidencial QA');
  assert.equal(read.structured.items[0].result_value, '95');
  const raw = (await db.query('SELECT * FROM lab_reports WHERE document_id=$1', [doc.id])).rows[0];
  assert.equal(raw.observations, null);
  assert.ok(!JSON.stringify(raw).includes('Observacion confidencial QA'));
});

test('MOD-17 | Conversión de datos existentes es idempotente y permite exportar', async () => {
  await require('../scripts/encrypt-clinical-data.cjs')();
  const before = (await db.query('SELECT id,encrypted_payload FROM documents ORDER BY id')).rows;
  await require('../scripts/encrypt-clinical-data.cjs')();
  assert.deepEqual((await db.query('SELECT id,encrypted_payload FROM documents ORDER BY id')).rows, before);
  const result = await require('../src/services/user.service').exportUserData(patient.id, { ipAddress: '127.0.0.1' });
  assert.ok(JSON.stringify(result).includes('Receta editada QA'));
  assert.ok(JSON.stringify(result).includes('Medicamento confidencial QA'));
  assert.ok(!JSON.stringify(result).includes('encrypted_payload'));
});

test('MOD-18 | Cifrado detecta modificación de contenido y cambio de registro', async () => {
  const store = require('../src/services/clinical-store.service');
  const row = (await db.query('SELECT * FROM documents WHERE encrypted_payload IS NOT NULL LIMIT 1')).rows[0];
  await assert.rejects(store.decode('documents', { ...row, id: randomUUID() }));
  await assert.rejects(store.decode('documents', { ...row, encrypted_payload: { ...row.encrypted_payload, tag: Buffer.alloc(16).toString('base64') } }));
});


test('MOD-19 | Ficha compartida por médico y QR recupera campos cifrados sin exponer el payload', async () => {
  const data = await require('../src/repositories/access-grant.repository').getPatientClinicalData(patient.id);
  assert.equal(data.profile.birthDate, '1995-06-15');
  assert.equal(data.profile.biologicalSex, 'FEMENINO');
  assert.deepEqual(data.profile.allergies, ['Alergia ficticia']);
  assert.ok(data.documents.some(d => d.title === 'Receta editada QA'));
  assert.ok(data.prescriptions.some(p => p.items.some(i => i.medication_name === 'Medicamento confidencial QA')));
  assert.ok(data.labReports.some(l => l.items.some(i => i.test_name === 'Parametro editado QA' && i.result_value === '95')));
  assert.ok(!JSON.stringify(data).includes('encrypted_payload'));
  assert.ok(!JSON.stringify(data).includes('[cifrado]'));
});
