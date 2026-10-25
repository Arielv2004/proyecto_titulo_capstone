import React from 'react';
import { Edit3 } from 'lucide-react';
import { Button, Card, InfoPopover, LoadingState, Notice, PageHeader } from '../ui/ClinicalUI';

export function PatientProfile({ user, profile, loading, error, onEdit, saved }) {
  const conditions = (profile.chronicConditions || []).filter(
    (c) => !c.startsWith('Medicamento: ') && !c.startsWith('Cirugía: '),
  );
  const medications = (profile.chronicConditions || [])
    .filter((c) => c.startsWith('Medicamento: '))
    .map((c) => c.slice(13));
  const surgeries = (profile.chronicConditions || [])
    .filter((c) => c.startsWith('Cirugía: '))
    .map((c) => c.slice(9));
  const display = (values, emptyText = 'No registrado') => {
    const cleaned = (values || []).filter(Boolean).map((value) => {
      if (/^ninguna alergia conocida$/i.test(value)) return 'Ninguna alergia conocida';
      if (/^ninguna enfermedad cr[oó]nica$/i.test(value)) return 'Ninguna enfermedad crónica';
      if (/^ning[uú]n f[aá]rmaco diario$/i.test(value)) return 'Ningún fármaco diario';
      if (/^ninguna cirug[ií]a previa$/i.test(value)) return 'Ninguna cirugía previa';
      return value;
    });
    return cleaned.length ? cleaned.join(', ') : emptyText;
  };
  return (
    <div className="mm-stack">
      <PageHeader
        eyebrow="ANTECEDENTES PERSONALES"
        title="Mi perfil de salud"
        eyebrowBelow
        hideTitle
        info={
          <InfoPopover label="Cómo usar Mi perfil">
            <p>Aquí ves los datos de tu cuenta y los antecedentes que has registrado. Usa «Editar perfil» para actualizar las opciones disponibles en el formulario.</p>
            <p>Los antecedentes declarados por ti acompañan la ficha que compartes; no sustituyen una evaluación médica.</p>
          </InfoPopover>
        }
        actions={
          <Button onClick={onEdit} disabled={loading || !!error}>
            <Edit3 size={18} />
            Editar perfil
          </Button>
        }
      />
      {saved && (
        <Notice title="Perfil actualizado" tone="success">
          Tus antecedentes se guardaron correctamente.
        </Notice>
      )}
      {loading ? (
        <LoadingState label="Cargando perfil de salud" />
      ) : error ? (
        <Notice tone="danger" title="No pudimos cargar tu perfil">
          {error}
        </Notice>
      ) : (
        <>
          <Card className="mm-profile-card" title="Datos de tu perfil">
            <div className="mm-profile-sections">
              <section className="mm-profile-section mm-profile-section--account" aria-labelledby="profile-account-title">
                <h3 id="profile-account-title">Datos de cuenta</h3>
                <dl className="mm-profile-fields mm-profile-fields--account">
                  <div><dt>Nombre</dt><dd>{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'No registrado'}</dd></div>
                  <div><dt>RUT</dt><dd>{user?.rut || 'No registrado'}</dd></div>
                  <div><dt>Correo electrónico</dt><dd>{user?.email || 'No registrado'}</dd></div>
                </dl>
              </section>
              <section className="mm-profile-section mm-profile-section--health" aria-labelledby="profile-health-title">
                <h3 id="profile-health-title">Datos de salud</h3>
                <dl className="mm-profile-fields">
                  <div><dt>Grupo sanguíneo</dt><dd>{profile.bloodType || 'No registrado'}</dd></div>
                  <div><dt>Previsión</dt><dd>{profile.healthInsurance || 'No registrada'}</dd></div>
                  <div><dt>Donación de órganos declarada</dt><dd>{profile.isOrganDonor === true ? 'Sí' : profile.isOrganDonor === false ? 'No' : 'No registrada'}</dd></div>
                </dl>
              </section>
              <section className="mm-profile-section mm-profile-section--history" aria-labelledby="profile-history-title">
                <h3 id="profile-history-title">Antecedentes personales</h3>
                <dl className="mm-profile-fields">
                  <div><dt>Alergias</dt><dd>{display(profile.allergies)}</dd></div>
                  <div><dt>Enfermedades crónicas</dt><dd>{display(conditions)}</dd></div>
                  <div><dt>Medicamentos declarados</dt><dd>{display(medications)}</dd></div>
                  <div><dt>Cirugías previas</dt><dd>{display(surgeries)}</dd></div>
                </dl>
              </section>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
