import React from 'react';
import { formatClinicalDate } from '../../utils/clinicalDate';
import { ArrowLeft, Clock, FileText, Phone, Printer } from 'lucide-react';
import { Button, Card, EmptyState, Notice, PageHeader, StatusBadge } from '../ui/ClinicalUI';

// The shared-record endpoint supplies patient-declared history and prescriptions.
// Its sample vitalSigns are deliberately excluded from clinical presentation.
export function ClinicalRecord({ data, timeLeft, onFinish }) {
  const { patient = {}, profile = {}, prescriptions = [] } = data;
  return (
    <main id="main-content" tabIndex={-1} className="mm-shell mm-stack">
      <div className="mm-actions">
        <Button variant="ghost" onClick={onFinish}>
          <ArrowLeft size={17} />
          Volver a pacientes
        </Button>
      </div>
      <PageHeader
        eyebrow="FICHA COMPARTIDA"
        title={[patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Paciente'}
        description={`RUT ${patient.rut || 'no informado'} · Información compartida por el paciente`}
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={17} />
              Imprimir
            </Button>
            <Button onClick={onFinish}>Finalizar consulta</Button>
          </>
        }
      />
      <Notice
        title="Consentimiento temporal vigente"
        action={
          <StatusBadge tone="success" icon={Clock}>
            {timeLeft ?? '—'} min restantes
          </StatusBadge>
        }
      >
        Consulta disponible mientras esté vigente el permiso del paciente.
      </Notice>
      <div className="mm-clinical-summary">
        <Card
          title="Antecedentes"
          description="Información declarada por el paciente. Fecha de actualización no disponible."
        >
          <dl className="mm-summary-list">
            <div>
              <dt>Alergias</dt>
              <dd>
                {profile.allergies?.length
                  ? profile.allergies.join(', ')
                  : 'Sin información registrada'}
              </dd>
            </div>
            <div>
              <dt>Enfermedades crónicas</dt>
              <dd>
                {profile.chronicConditions?.length
                  ? profile.chronicConditions.join(', ')
                  : 'Sin información registrada'}
              </dd>
            </div>
          </dl>
        </Card>
        <Card title="Datos de la ficha">
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
          <span className="mm-icon mb-4">
            <Phone size={22} aria-hidden="true" />
          </span>
          <dl className="mm-summary-list">
            <div>
              <dt>Nombre</dt>
              <dd>{profile.emergencyContactName || 'Sin registrar'}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>
                {profile.emergencyContactPhone ? (
                  <a className="mm-text-link" href={`tel:${profile.emergencyContactPhone}`}>
                    {profile.emergencyContactPhone}
                  </a>
                ) : (
                  'Sin registrar'
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
      <Card
        title="Recetas y medicamentos"
        description="Ordenados por fecha de emisión. La vigencia de un documento no confirma que un tratamiento siga en uso."
      >
        <Notice title="Procedencia y revisión">
          Datos guardados en recetas del paciente. Esta vista no informa quién revisó la extracción
          ni acredita una validación médica.
        </Notice>
        {prescriptions.length === 0 ? (
          <EmptyState
            title="Sin recetas registradas"
            description="No hay recetas disponibles en la ficha compartida."
          />
        ) : (
          <div className="mm-stack mt-5">
            {prescriptions.map((rx) => (
              <article key={rx.id} className="mm-prescription">
                <div className="mm-card-heading">
                  <div>
                    <h3>{rx.diagnosis_text || 'Receta médica'}</h3>
                    <p>{rx.doctor_name || 'Profesional no informado'}</p>
                  </div>
                  <StatusBadge>Revisión no informada</StatusBadge>
                </div>
                <dl className="mm-source-grid">
                  <div>
                    <dt>Emisión</dt>
                    <dd>{formatClinicalDate(rx.issue_date)}</dd>
                  </div>
                  <div>
                    <dt>Vigencia registrada</dt>
                    <dd>{formatClinicalDate(rx.valid_until)}</dd>
                  </div>
                  <div>
                    <dt>Procedencia</dt>
                    <dd>
                      {rx.document_id
                        ? 'Documento de receta asociado'
                        : 'Receta sin documento asociado'}
                    </dd>
                  </div>
                </dl>
                {rx.items?.length ? (
                  <div
                    className="mm-table-scroll"
                    role="region"
                    aria-label={`Medicamentos de receta ${formatClinicalDate(rx.issue_date)}`}
                    tabIndex={0}
                  >
                    <table className="mm-clinical-table">
                      <thead>
                        <tr>
                          <th scope="col">Medicamento</th>
                          <th scope="col">Dosis y frecuencia</th>
                          <th scope="col">Duración e indicaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rx.items.map((item, i) => (
                          <tr key={item.id || i}>
                            <th scope="row">{item.medication_name || 'No informado'}</th>
                            <td>
                              {item.dosage || 'Dosis no informada'}
                              <span>{item.frequency || 'Frecuencia no informada'}</span>
                            </td>
                            <td>
                              {item.duration || 'Duración no informada'}
                              {item.instructions && <span>{item.instructions}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mm-muted">Esta receta no tiene medicamentos detallados.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>
      <Card title="Documentos y resultados" description="Disponibilidad en la ficha compartida">
        <EmptyState
          icon={FileText}
          title="Esta vista aún no incluye documentos ni resultados de exámenes"
          description="La información disponible para esta consulta comprende los antecedentes y las recetas mostrados arriba."
        />
      </Card>
    </main>
  );
}
