import json, html
from pathlib import Path
root=Path.cwd().parent/'docs'/'modelo-datos'
data=json.loads((root/'esquema.json').read_text(encoding='utf-8'))
colors=['#12635f','#194e83','#58417b','#87551b']
sections=[]
for (area,tables),color in zip(data['groups'].items(),colors):
 cards=[]
 for table in tables:
  rows=[]
  for c in [c for c in data['columns'] if c['table_name']==table]:
   fk=next((r for r in data['relations'] if r['table_name']==table and r['column_name']==c['column_name']),None)
   link=f"<small>→ {fk['referenced_table']}.{fk['referenced_column']}</small>" if fk else ''
   flags=('PK ' if c['primary_key'] else '')+('FK' if fk else '')
   kind=c['data_type']+(' · opcional' if c['is_nullable']=='YES' else '')
   rows.append(f"<tr><td>{c['column_name']}{link}</td><td>{flags}</td><td>{html.escape(kind)}</td></tr>")
  cards.append(f"<article><h3>{table}</h3><table>{''.join(rows)}</table></article>")
 sections.append(f'<section style="--area:{color}"><h2>{area} · {len(tables)} tablas</h2><div class="tables">'+''.join(cards)+'</div></section>')
css='''*{box-sizing:border-box}body{margin:0;background:#f0f4f6;color:#172d3b;font:15px Arial,sans-serif}header{padding:24px 30px;background:#123742;color:white}h1{margin:0 0 10px;font-size:26px}header p{margin:0 0 12px}input{padding:10px;width:min(440px,100%);border-radius:6px;border:1px solid #abbfc6}main{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:20px}section{border:2px solid var(--area);border-radius:10px;overflow:hidden;background:color-mix(in srgb,var(--area) 8%,white)}h2{margin:0;padding:14px;background:var(--area);color:white;font-size:20px}.tables{padding:14px;columns:2;column-gap:14px}article{break-inside:avoid;background:white;border:1px solid var(--area);border-radius:8px;padding:12px;margin-bottom:14px}h3{margin:0 0 8px;padding-bottom:8px;color:var(--area);border-bottom:1px solid var(--area);font-size:18px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:12px}td{padding:5px 3px;vertical-align:top;border-bottom:1px solid #edf0f2;overflow-wrap:anywhere}td:first-child{width:53%}td:nth-child(2){font-weight:bold;color:var(--area);width:12%}td:last-child{font-size:10px;color:#506773}small{display:block;font-size:10px;color:#506773;margin-top:3px}@media(max-width:1000px){main{grid-template-columns:1fr}}@media(max-width:550px){.tables{columns:1}}@media print{header input{display:none}main{display:block}section{break-inside:avoid;margin:12px 0}}'''
js="document.querySelector('input').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(q))})"
(root/'modelo.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Modelo de datos MyMedRecord</title><style>'+css+'</style><header><h1>Modelo de datos de MyMedRecord</h1><p>18 tablas · 23 claves foráneas · PK: clave primaria · FK: clave foránea</p><input type="search" placeholder="Buscar una tabla o campo" aria-label="Buscar tabla o campo"></header><main>'+''.join(sections)+'</main><script>'+js+'</script></html>',encoding='utf-8')
print('Vista actualizada de las 18 tablas.')
