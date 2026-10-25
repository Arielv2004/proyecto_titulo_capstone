import React, { useState } from 'react';
import { Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { DialogFrame } from '../ui/DialogFrame';

const emptyMedication = () => ({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });
const emptyMetric = () => ({ name: '', value: '', unit: '', referenceRange: '', isAbnormal: false });

export function EditDocumentDialog({ document: doc, onClose, onSave, onReplace, onDelete, saving, error }) {
  const structured = doc.structured || {};
  const [form, setForm] = useState({
    title: doc.title || '',
    documentType: doc.documentType || 'OTRO',
    documentDate: doc.documentDateRaw || '',
    issuingDoctor: doc.doctor === '—' ? '' : (doc.doctor || ''),
    issuingInstitution: doc.institution === '—' ? '' : (doc.institution || ''),
    diagnosisText: structured.diagnosis_text || '',
    validUntil: structured.valid_until ? String(structured.valid_until).slice(0, 10) : '',
    observations: structured.observations || '',
    medications: (doc.documentType === 'RECETA' ? structured.items || [] : []).map((item) => ({
      name: item.medication_name || '', dosage: item.dosage || '', frequency: item.frequency || '',
      duration: item.duration || '', instructions: item.instructions || '',
    })),
    labMetrics: (doc.documentType === 'EXAMEN_LAB' ? structured.items || [] : []).map((item) => ({
      name: item.test_name || '', value: item.result_value || '', unit: item.unit || '',
      referenceRange: item.reference_range || '', isAbnormal: Boolean(item.is_abnormal),
    })),
  });

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const updateRow = (key, index, name, value) => setForm((current) => ({
    ...current,
    [key]: current[key].map((row, i) => i === index ? { ...row, [name]: value } : row),
  }));
  const removeRow = (key, index) => setForm((current) => ({
    ...current, [key]: current[key].filter((_, i) => i !== index),
  }));
  const fieldClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal-400';

  return (
    <DialogFrame label="Actualizar documento" onClose={saving ? undefined : onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs">
      <form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Actualizar documento</h2>
            <p className="mt-1 text-sm text-muted">Corrige los datos guardados. Comprueba los valores con el archivo original.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} disabled={saving} className="rounded-xl p-2 text-muted hover:bg-surface-muted"><X size={19} /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-body sm:col-span-2">Título
            <input className={`${fieldClass} mt-1`} value={form.title} maxLength={200} required onChange={(e) => setField('title', e.target.value)} />
          </label>
          <label className="text-sm font-semibold text-body">Tipo
            <select className={`${fieldClass} mt-1`} value={form.documentType} onChange={(e) => setField('documentType', e.target.value)}>
              <option value="RECETA">Receta médica</option><option value="EXAMEN_LAB">Examen de laboratorio</option>
              <option value="INFORME">Informe</option><option value="IMAGEN">Imagen</option><option value="OTRO">Otro</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-body">Fecha de emisión
            <input type="date" className={`${fieldClass} mt-1`} value={form.documentDate} onChange={(e) => setField('documentDate', e.target.value)} />
          </label>
          <label className="text-sm font-semibold text-body">Profesional
            <input className={`${fieldClass} mt-1`} value={form.issuingDoctor} maxLength={150} onChange={(e) => setField('issuingDoctor', e.target.value)} />
          </label>
          <label className="text-sm font-semibold text-body">Institución
            <input className={`${fieldClass} mt-1`} value={form.issuingInstitution} maxLength={150} onChange={(e) => setField('issuingInstitution', e.target.value)} />
          </label>
        </div>

        {form.documentType === 'RECETA' && (
          <section className="space-y-3 rounded-2xl border border-line bg-canvas p-4">
            <h3 className="font-bold text-ink">Datos de la receta</h3>
            <label className="block text-sm text-body">Diagnóstico registrado
              <input className={`${fieldClass} mt-1`} value={form.diagnosisText} maxLength={255} onChange={(e) => setField('diagnosisText', e.target.value)} />
            </label>
            <label className="block text-sm text-body">Vigencia indicada en el documento
              <input type="date" className={`${fieldClass} mt-1`} value={form.validUntil} onChange={(e) => setField('validUntil', e.target.value)} />
            </label>
            <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-ink">Medicamentos</h4>
              <button type="button" onClick={() => setField('medications', [...form.medications, emptyMedication()])} className="mm-text-link inline-flex items-center gap-1 text-sm"><Plus size={15} /> Agregar</button>
            </div>
            {form.medications.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2">
                {[['name', 'Medicamento'], ['dosage', 'Dosis'], ['frequency', 'Frecuencia'], ['duration', 'Duración'], ['instructions', 'Indicaciones']].map(([key, label]) => (
                  <label key={key} className="text-xs text-body">{label}<input className={`${fieldClass} mt-1`} value={item[key]} onChange={(e) => updateRow('medications', index, key, e.target.value)} /></label>
                ))}
                <button type="button" onClick={() => removeRow('medications', index)} className="inline-flex items-center justify-center gap-1 text-sm text-rose-600"><Trash2 size={15} /> Quitar medicamento</button>
              </div>
            ))}
          </section>
        )}

        {form.documentType === 'EXAMEN_LAB' && (
          <section className="space-y-3 rounded-2xl border border-line bg-canvas p-4">
            <h3 className="font-bold text-ink">Resultados de laboratorio</h3>
            <label className="block text-sm text-body">Observaciones
              <textarea className={`${fieldClass} mt-1`} value={form.observations} rows={2} onChange={(e) => setField('observations', e.target.value)} />
            </label>
            <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-ink">Parámetros</h4>
              <button type="button" onClick={() => setField('labMetrics', [...form.labMetrics, emptyMetric()])} className="mm-text-link inline-flex items-center gap-1 text-sm"><Plus size={15} /> Agregar</button>
            </div>
            {form.labMetrics.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2">
                {[['name', 'Parámetro'], ['value', 'Resultado'], ['unit', 'Unidad'], ['referenceRange', 'Rango de referencia']].map(([key, label]) => (
                  <label key={key} className="text-xs text-body">{label}<input className={`${fieldClass} mt-1`} value={item[key]} onChange={(e) => updateRow('labMetrics', index, key, e.target.value)} /></label>
                ))}
                <label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={item.isAbnormal} onChange={(e) => updateRow('labMetrics', index, 'isAbnormal', e.target.checked)} /> Marcado como alterado en el documento</label>
                <button type="button" onClick={() => removeRow('labMetrics', index)} className="inline-flex items-center justify-center gap-1 text-sm text-rose-600"><Trash2 size={15} /> Quitar resultado</button>
              </div>
            ))}
          </section>
        )}

        {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600"><Trash2 size={16} /> Eliminar</button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onReplace} disabled={saving} className="mm-button mm-button--secondary"><Upload size={16} /> Reemplazar archivo</button>
            <button type="submit" disabled={saving} className="mm-button mm-button--primary"><Save size={16} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </div>
      </form>
    </DialogFrame>
  );
}
