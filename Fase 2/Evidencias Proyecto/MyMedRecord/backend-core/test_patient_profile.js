const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });

// Todos los datos y las migraciones de esta prueba viven en una base desechable.
test('perfil: migración compatible, identidad, permisos y exportación', async t => {
  const database = 'mmr_profile_test_' + randomUUID().replaceAll('-', '');
  const admin = new Client({ host: '127.0.0.1', port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD, database: 'postgres' });
  await admin.connect();
  t.after(() => admin.end());
  await admin.query('CREATE DATABASE ' + database);
  Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_NAME: database, JWT_SECRET: randomUUID() });
  const db = require('./src/config/db');
  const server = require('./src/app').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const request = (route, method = 'GET', body, auth) => fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    for (const file of ['database/init.sql', 'agregar_ubicacion_medicos.sql']) {
      await db.query(await fs.readFile(path.join(__dirname, '..', file), 'utf8'));
    }
    await t.test('migración repetible desde columnas antiguas sin inferir sexo', async () => {
      const before = (await db.query('SELECT user_id,gender FROM patient_profiles ORDER BY user_id')).rows;
      await db.query('ALTER TABLE patient_profiles DROP COLUMN biological_sex, DROP COLUMN gender_other');
      const migration = await fs.readFile(path.join(__dirname, '../database/migrations/003_patient_identity.sql'), 'utf8');
      await db.query(migration);
      await db.query(migration);
      assert.deepEqual((await db.query('SELECT user_id,gender FROM patient_profiles ORDER BY user_id')).rows, before);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM patient_profiles WHERE biological_sex IS NOT NULL')).rows[0].n, 0);
    });
    const patient = (await db.query("SELECT id,rut,first_name,last_name,email,role FROM users WHERE role='PACIENTE' LIMIT 1")).rows[0];
    const doctor = (await db.query("SELECT id FROM users WHERE role='MEDICO' LIMIT 1")).rows[0];
    const token = user => jwt.sign({ ...user, role: user === doctor ? 'MEDICO' : 'PACIENTE' }, process.env.JWT_SECRET);
    const auth = token(patient);
    const get = async () => (await (await request('/patient-profile/me', 'GET', undefined, auth)).json()).data;
    const put = (body, session = auth) => request('/patient-profile/me', 'PUT', body, session);
    await t.test('registra e inicia sesión con una cuenta nueva sin valores inferidos', async () => {
      const payload = { rut: '76.123.456-0', firstName: 'Prueba', lastName: 'Perfil', email: 'perfil-prueba@example.test',
        password: 'PruebaPerfil2026!', role: 'PACIENTE', acceptedTerms: true };
      // RUT calculado para una cuenta ficticia, independiente de los usuarios demo.
      const digits = '76123456'; let sum = 0;
      [...digits].reverse().forEach((digit, i) => { sum += Number(digit) * (2 + i % 6); });
      const dv = 11 - sum % 11;
      payload.rut = digits + '-' + (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
      const created = await request('/auth/register', 'POST', payload);
      assert.equal(created.status, 201, await created.clone().text());
      const login = await request('/auth/login', 'POST', { email: payload.email, password: payload.password });
      assert.equal(login.status, 200);
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const result = await fetch(base + '/patient-profile/me', { headers: { cookie } });
      const profile = (await result.json()).data;
      assert.equal(profile.biological_sex, null);
      assert.equal(profile.gender, null);
      assert.equal(profile.gender_other, null);
    });
    await t.test('omite datos antiguos sin borrarlos y rechaza valores inválidos', async () => {
      const legacy = (await get()).gender;
      assert.equal((await put({ bloodType: 'O+' })).status, 200);
      assert.equal((await get()).gender, legacy);
      for (const body of [
        { biologicalSex: null }, { biologicalSex: '' }, { biologicalSex: 'INTERSEXUAL' }, { biologicalSex: [] },
        { gender: 'INVALIDO' }, { gender: {} }, { gender: 'OTRA_IDENTIDAD', genderOther: '   ' },
        { gender: 'OTRA_IDENTIDAD', genderOther: 'x'.repeat(81) }, { gender: 'OTRA_IDENTIDAD', genderOther: 5 },
        { gender: 'MUJER', genderOther: 'texto incompatible' },
      ]) assert.equal((await put(body)).status, 400, JSON.stringify(body));
      assert.equal((await get()).gender, legacy);
    });
    await t.test('guarda, recarga, exporta y limpia género explícitamente', async () => {
      assert.equal((await put({ biologicalSex: 'FEMENINO', gender: 'OTRA_IDENTIDAD', genderOther: '  Identidad ficticia  ',
        bloodType: 'O+', healthInsurance: 'FONASA Tramo A' })).status, 200);
      let p = await get();
      assert.equal(p.biological_sex, 'FEMENINO'); assert.equal(p.gender_other, 'Identidad ficticia');
      const exported = await request('/users/me/export', 'GET', undefined, auth);
      assert.equal(exported.status, 200);
      const json = await exported.json();
      assert.equal(json.health_profile.biological_sex, p.biological_sex);
      assert.equal(json.health_profile.gender_other, p.gender_other);
      assert.equal((await put({ gender: 'MUJER' })).status, 200);
      assert.equal((await get()).gender_other, null);
      assert.equal((await put({ gender: null })).status, 200);
      p = await get(); assert.equal(p.gender, null); assert.equal(p.biological_sex, 'FEMENINO');
      const audit = (await db.query("SELECT details FROM audit_logs WHERE action='PATIENT_PROFILE_UPDATED' AND patient_id=$1", [patient.id])).rows;
      assert.ok(audit.every(row => !/biological|gender|Identidad ficticia/.test(JSON.stringify(row.details))));
    });
    await t.test('rechaza médicos, sesiones ausentes e inactivos; ignora otro propietario', async () => {
      assert.equal((await request('/patient-profile/me', 'PUT', { biologicalSex: 'FEMENINO' })).status, 401);
      assert.equal((await put({ biologicalSex: 'FEMENINO' }, token(doctor))).status, 403);
      const other = (await db.query("SELECT id FROM users WHERE email='perfil-prueba@example.test'")).rows[0];
      assert.equal((await put({ userId: other.id, patient_id: other.id, biologicalSex: 'MASCULINO' })).status, 200);
      assert.equal((await db.query('SELECT biological_sex FROM patient_profiles WHERE user_id=$1', [other.id])).rows[0].biological_sex, null);
      await db.query('UPDATE users SET is_active=false WHERE id=$1', [patient.id]);
      assert.equal((await put({ biologicalSex: 'FEMENINO' })).status, 403);
      await db.query('UPDATE users SET is_active=true WHERE id=$1', [patient.id]);
    });
    if (process.env.PLAYWRIGHT_MODULE_PATH) {
      await t.test('formulario real: confirmación, errores, sesión, móvil y temas', async () => {
        await require('./tests/profile-browser.cjs')({ base, db, patient, token: auth });
      });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.pool.end();
    await admin.query('DROP DATABASE ' + database);

  }
});
