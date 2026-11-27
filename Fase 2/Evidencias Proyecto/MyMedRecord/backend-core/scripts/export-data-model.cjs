// Solo consulta metadatos del esquema; no exporta filas ni credenciales.
const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../src/config/db');

async function exportModel() {
  const output = path.resolve(__dirname, '../../docs/modelo-datos');
  await fs.mkdir(output, { recursive: true });
  const columns = (await db.query(`SELECT c.table_name,c.column_name,c.data_type,c.is_nullable,
    EXISTS(SELECT 1 FROM information_schema.key_column_usage k JOIN information_schema.table_constraints t
      USING(constraint_catalog,constraint_schema,constraint_name)
      WHERE t.constraint_type='PRIMARY KEY' AND k.table_schema=c.table_schema AND k.table_name=c.table_name AND k.column_name=c.column_name) AS primary_key
    FROM information_schema.columns c WHERE c.table_schema='public'
    AND EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema=c.table_schema
      AND t.table_name=c.table_name AND t.table_type='BASE TABLE')
    ORDER BY c.table_name,c.ordinal_position`)).rows;
  const relations = (await db.query(`SELECT tc.table_name,kcu.column_name,ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu USING(constraint_catalog,constraint_schema,constraint_name)
    JOIN information_schema.referential_constraints rc USING(constraint_catalog,constraint_schema,constraint_name)
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_catalog=rc.unique_constraint_catalog AND ccu.constraint_schema=rc.unique_constraint_schema AND ccu.constraint_name=rc.unique_constraint_name
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' ORDER BY tc.table_name,kcu.column_name`)).rows;
  const unique = (await db.query(`SELECT t.table_name,array_agg(k.column_name ORDER BY k.ordinal_position) AS columns
    FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k
    USING(constraint_catalog,constraint_schema,constraint_name)
    WHERE t.table_schema='public' AND t.constraint_type IN ('UNIQUE','PRIMARY KEY') GROUP BY t.table_name,t.constraint_name`)).rows;
  const tables = [...new Set(columns.map(c => c.table_name))];
  const groups = {
    'Usuarios y perfiles': ['users','patient_profiles','doctor_profiles','health_institutions'],
    'Documentos clinicos': ['documents','prescriptions','prescription_items','lab_reports','lab_test_items'],
    'Accesos y actividad': ['access_grants','qr_visitor_requests','appointments','audit_logs'],
    'Seguridad y operacion': ['auth_sessions','password_reset_tokens','privacy_acceptances','document_deletions','security_rate_limits'],
  };
  if (tables.length !== 18 || Object.values(groups).flat().some(t => !tables.includes(t))) throw new Error('El esquema no coincide con las 18 tablas esperadas.');
  await fs.writeFile(path.join(output,'esquema.json'), JSON.stringify({ database: 'mymedrecord_main', tables: tables.length, groups, columns, relations, uniqueConstraints: unique }, null, 2));
  let mermaid = 'erDiagram\n';
  for (const table of tables) {
    mermaid += `  ${table} {\n`;
    for (const c of columns.filter(c => c.table_name === table)) {
      const fk = relations.some(r => r.table_name === table && r.column_name === c.column_name);
      mermaid += `    ${c.data_type.replaceAll(' ','_')} ${c.column_name}${c.primary_key && fk ? ' PK,FK' : c.primary_key ? ' PK' : fk ? ' FK' : ''}\n`;
    }
    mermaid += '  }\n';
  }
  for (const r of relations) {
    const mandatory = columns.find(c => c.table_name === r.table_name && c.column_name === r.column_name).is_nullable === 'NO';
    const one = unique.some(u => u.table_name === r.table_name && u.columns.length === 1 && u.columns[0] === r.column_name);
    mermaid += `  ${r.referenced_table} ${mandatory ? '||' : '|o'}--${one ? 'o|' : 'o{'} ${r.table_name} : "${r.column_name}"\n`;
  }
  await fs.writeFile(path.join(output,'relaciones.mmd'), mermaid);
  console.log(`Modelo exportado: ${tables.length} tablas y ${relations.length} claves foráneas.`);
}
if (require.main === module) exportModel().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.pool.end());
module.exports = exportModel;
