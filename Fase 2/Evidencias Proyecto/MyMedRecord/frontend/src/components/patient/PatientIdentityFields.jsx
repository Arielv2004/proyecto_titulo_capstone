import React from 'react';
import { BIOLOGICAL_SEX_OPTIONS, GENDER_OPTIONS, isKnownGender } from '../../utils/patientIdentity';

const inputClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink';

export function PatientIdentityFields({ value, onChange }) {
  const update = patch => onChange({ ...value, ...patch });
  return (
    <fieldset className="space-y-3 rounded-2xl border border-line bg-canvas/70 p-3">
      <legend className="px-1 text-sm font-bold text-ink">Datos de cuenta</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-2">
          <span className="block font-bold text-ink">Sexo biológico <span className="font-normal text-muted">(obligatorio)</span></span>
          <select required className={inputClass} value={value.biologicalSex} onChange={e => update({ biologicalSex: e.target.value })}>
            <option value="" disabled>Selecciona una opción</option>
            {BIOLOGICAL_SEX_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="block font-bold text-ink">Género <span className="font-normal text-muted">(opcional)</span></span>
          <select className={inputClass} value={value.gender} onChange={e => update({ gender: e.target.value, genderOther: '' })}>
            <option value="">Sin registrar</option>
            {value.gender && !isKnownGender(value.gender) && <option value={value.gender}>{value.gender} (registrado anteriormente)</option>}
            {GENDER_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </div>
      {value.gender === 'OTRA_IDENTIDAD' && (
        <label className="block space-y-2">
          <span className="block font-bold text-ink">Especifica tu identidad de género</span>
          <input required maxLength={80} className={inputClass} value={value.genderOther} onChange={e => update({ genderOther: e.target.value })} aria-describedby="gender-other-help" />
          <span id="gender-other-help" className="block text-muted">Entre 1 y 80 caracteres.</span>
        </label>
      )}
      <label className="block space-y-2">
        <span className="block font-bold text-ink">Teléfono personal</span>
        <input type="tel" autoComplete="tel" maxLength={20} pattern="[ ]*[+]?(?:[ ]*[0-9]){7,15}[ ]*"
          title="Ingresa entre 7 y 15 dígitos. Puedes usar espacios y un signo + al inicio."
          className={inputClass} value={value.phone} onChange={e => update({ phone: e.target.value })} />
      </label>
    </fieldset>
  );
}
