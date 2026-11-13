const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

// Run against local PostgreSQL with its test administrator in DB_USER/DB_PASSWORD.
// All fixtures go in a freshly created database, never the application database.
test('canje QR concurrente, consulta temporal y acceso directo independiente', async (t) => {
  const database = 'mmr_qr_test_' + randomUUID().replaceAll('-', '');
  const admin = new Client({host: '127.0.0.1', port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD, database: 'postgres'});
  await admin.connect();

  await admin.query('CREATE DATABASE ' + database);
  t.after(async () => { try { await admin.query('DROP DATABASE ' + database); } finally { await admin.end(); } });
  Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_NAME: database, JWT_SECRET: randomUUID() });
  const db = require('./src/config/db');
  const app = require('./src/app');
  const server = app.listen(0, '127.0.0.1');


  try {
    for (const file of ['database/init.sql', 'agregar_ubicacion_medicos.sql']) {
      await db.query(await fs.readFile(path.join(__dirname, '..', file), 'utf8'));
    }
    const doctor = (await db.query("SELECT id FROM users WHERE role='MEDICO' LIMIT 1")).rows[0];
    const session = () => jwt.sign({id: doctor.id, role: 'MEDICO', jti: randomUUID()}, process.env.JWT_SECRET);
    const first = session(), second = session();
    const token = 'QR-DEMO-2026-TOKEN';
    const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/access-grants/';
    const post = (route, auth, data) => fetch(base + route, {method: 'POST',
      headers: {Authorization: 'Bearer ' + auth, 'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    const direct = () => fetch(base + 'direct/DIRECTO-DEMO-2026-TOKEN', {headers: {Authorization: 'Bearer ' + first}});
    function assertPatientPhone(record) {
      assert.equal(record.patient.phone, '+56 9 1111 1111');
      assert.equal(Object.hasOwn(record.profile, 'emergencyContactName'), false);
      assert.equal(Object.hasOwn(record.profile, 'emergencyContactPhone'), false);
    }
    const shared = await direct();
    assert.equal(shared.status, 200);
    assertPatientPhone((await shared.json()).data.clinicalData);
    const attempts = await Promise.all([first,second].map(auth => post('validate', auth, {token})));
    assert.deepEqual(attempts.map(r => r.status).sort(), [200,410]);
    const winner = attempts.findIndex(r => r.ok);
    const auth = [first, second][winner];
    const {data} = await attempts[winner].json();
    assertPatientPhone(data.clinicalData);
    const consultation = {token, consultationProof: data.consultationProof};
    assert.equal((await post('qr/check', auth, consultation)).status, 200);
    assert.equal((await post('qr/check', [second, first][winner], consultation)).status, 403);
    assert.equal((await post('qr/check', auth, {token})).status, 403);
    const file = path.join(__dirname, 'uploads', database + '.pdf');
    try {
      await fs.writeFile(file, 'documento ficticio');
      const result = await db.query('UPDATE documents SET file_path=$1 WHERE id=(SELECT id FROM documents LIMIT 1) RETURNING id', [file]);
      const request = {...consultation, documentId: result.rows[0].id};
      const original = await post('qr/document-file', auth, request);
      assert.equal(original.status, 200);
      assert.equal(await original.text(), 'documento ficticio');
      await t.test('un visitante consume el mismo pase y necesita aprobación en su navegador', async () => {
        const owner = (await db.query('SELECT patient_id FROM access_grants WHERE token=$1', [token])).rows[0].patient_id;
        const patientAuth = jwt.sign({id: owner, role: 'PACIENTE'}, process.env.JWT_SECRET);
        const generate = async () => (await (await post('generate', patientAuth, {durationHours: 1})).json()).data;
        const identity = {name: 'Visitante de prueba', rut: '12.345.678-5', institution: 'Centro de prueba'};
        const visitor = (pass, fields = identity) => fetch(base + 'qr/visitor', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({token: pass, ...fields}),
        });
        const pass = await generate();
        assert.equal((await visitor(pass.token, {})).status, 400);
        for (const institution of [undefined, '   ', 'a'.repeat(201)]) {
          assert.equal((await visitor(pass.token, {...identity, institution})).status, 400);
        }
        assert.equal((await visitor(pass.token, {...identity, name: ' '})).status, 400);
        assert.equal((await visitor(pass.token, {...identity, rut: '12.345.678-0'})).status, 400);
        assert.equal((await visitor('DIRECTO-DEMO-2026-TOKEN')).status, 410);
        const replies = await Promise.all([visitor(pass.token), visitor(pass.token)]);
        assert.deepEqual(replies.map(r => r.status).sort(), [202,410]);
        const accepted = replies.find(r => r.status === 202);
        assert.equal((await accepted.json()).data.status, 'PENDING');
        const headers = {cookie: accepted.headers.get('set-cookie').split(';')[0]};
        const url = base + 'qr/visitor/' + pass.id + '/';
        const identify = rut => fetch(url+'identify', {method:'POST', headers:{...headers, 'Content-Type':'application/json'},
          body:JSON.stringify({...identity, rut})});
        const pending = await fetch(base + 'qr/visitor/requests', {headers: {Authorization: 'Bearer ' + patientAuth}});
        assert.deepEqual((await pending.json()).data.find(row => row.id === pass.id), {id: pass.id, ...identity});
        assert.equal((await identify('12.345.678-5')).status, 409);
        assert.equal((await post('validate', first, {token: pass.token})).status, 410);
        assert.equal((await fetch(url+'record', {headers})).status, 403);
        assert.equal((await fetch(url+'documents/'+request.documentId, {headers})).status, 403);
        assert.equal((await post('qr/visitor/'+pass.id+'/decision', first, {decision:'APPROVED'})).status, 403);
        assert.equal((await post('qr/visitor/'+pass.id+'/decision', patientAuth, {decision:'APPROVED'})).status, 204);
        assert.equal((await fetch(url+'record')).status, 403);
        const visitorRecord = await fetch(url+'record', {headers});
        assert.equal(visitorRecord.status, 200);
        assertPatientPhone((await visitorRecord.json()).data.clinicalData);
        assert.equal(await (await fetch(url+'documents/'+request.documentId, {headers})).text(), 'documento ficticio');
        await db.query('UPDATE access_grants SET is_revoked=TRUE WHERE id=$1', [pass.id]);
        assert.equal((await fetch(url+'record', {headers})).status, 410);
        assert.equal((await fetch(url+'documents/'+request.documentId, {headers})).status, 410);
        const other = await generate();
        const race = await Promise.all([post('validate', first, {token:other.token}), visitor(other.token)]);
        assert.equal(race.filter(r => r.ok).length, 1);
        assert.equal(race.filter(r => r.status === 410).length, 1);
        assert.equal((await direct()).status, 200);
      });
      await db.query("UPDATE access_grants SET starts_at=NOW()-interval '2 hours', expires_at=NOW()-interval '1 hour' WHERE token=$1", [token]);
      assert.equal((await post('qr/check', auth, consultation)).status, 403);
      await db.query("UPDATE access_grants SET expires_at=NOW()+interval '1 hour', is_revoked=TRUE WHERE token=$1", [token]);
      assert.equal((await post('qr/document-file', auth, request)).status, 403);
      assert.equal((await direct()).status, 200);
    } finally {
      await fs.rm(file, {force: true});
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.pool.end();
  }
});
