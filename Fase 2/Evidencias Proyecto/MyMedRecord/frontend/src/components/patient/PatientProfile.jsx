import React from 'react';
import { Edit3 } from 'lucide-react';
import { Button, Card, LoadingState, Notice, PageHeader, StatusBadge } from '../ui/ClinicalUI';

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
  return (
    <div className="mm-stack">
      <PageHeader
        eyebrow="ANTECEDENTES PERSONALES"
        title="Mi perfil de salud"
        description="Mantén tus datos personales y antecedentes al día para compartirlos en tu próxima consulta."
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
          <Card
            title={[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Mi cuenta'}
            description="Identificación de tu cuenta"
            action={
              <StatusBadge tone={profile.isCompleted ? 'success' : 'warning'}>
                {profile.isCompleted ? 'Datos básicos completos' : 'Datos por completar'}
              </StatusBadge>
            }
          >
            <dl className="mm-source-grid">
              <div>
                <dt>RUT</dt>
                <dd>{user?.rut || 'Sin registrar'}</dd>
              </div>
              <div>
                <dt>Correo electrónico</dt>
                <dd>{user?.email || 'Sin registrar'}</dd>
              </div>
              <div>
                <dt>Procedencia</dt>
                <dd>Información declarada por ti</dd>
              </div>
            </dl>
          </Card>
          <div className="mm-profile-grid">
            <Card title="Datos de salud">
              <dl className="mm-summary-list">
                <div>
                  <dt>Grupo sanguíneo</dt>
                  <dd>{profile.bloodType || 'Sin registrar'}</dd>
                </div>
                <div>
                  <dt>Previsión</dt>
                  <dd>{profile.healthInsurance || 'Sin registrar'}</dd>
                </div>
                <div>
                  <dt>Donación de órganos declarada</dt>
                  <dd>
                    {profile.isOrganDonor === true
                      ? 'Sí'
                      : profile.isOrganDonor === false
                        ? 'No'
                        : 'Sin registrar'}
                  </dd>
                </div>
              </dl>
            </Card>
            <Card title="Contacto de emergencia">
              <dl className="mm-summary-list">
                <div>
                  <dt>Nombre</dt>
                  <dd>{profile.emergencyContactName || 'Sin registrar'}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{profile.emergencyContactPhone || 'Sin registrar'}</dd>
                </div>
              </dl>
            </Card>
            {[
              ['Alergias', profile.allergies],
              ['Enfermedades crónicas', conditions],
              ['Medicamentos declarados', medications],
              ['Cirugías previas', surgeries],
            ].map(([title, values]) => (
              <Card key={title} title={title}>
                {values?.length ? (
                  <ul className="mm-history-list">
                    {values.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mm-muted">Sin información registrada.</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
