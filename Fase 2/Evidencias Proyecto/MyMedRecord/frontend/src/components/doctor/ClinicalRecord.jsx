import React from 'react';
import { formatClinicalDate } from '../../utils/clinicalDate';
import { ArrowLeft, Clock, FileText, Phone, Printer, ExternalLink } from 'lucide-react';
import { Button, Card, EmptyState, Notice, PageHeader, StatusBadge } from '../ui/ClinicalUI';

export function ClinicalRecord({ data, timeLeft, onFinish, onOpenFile, fileError, openingFileId, backLabel = 'Volver a pacientes' }) {
  const { patient = {}, profile = {}, prescriptions = [], labReports = [], documents = [] } = data;
  const sourceDate = profile.updatedAt ? formatClinicalDate(profile.updatedAt) : 'Fecha no informada';
  return (
    <main id="main-content" tabIndex={-1} className="mm-shell mm-stack">
      <div className="mm-actions">
        <Button variant="ghost" onClick={onFinish}>
          <ArrowLeft size={17} />
          {backLabel}
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
          description={`Información declarada por el paciente. Actualización: ${sourceDate}.`}
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
              <dt>Fecha de nacimiento</dt>
              <dd>{formatClinicalDate(profile.birthDate)}</dd>
            </div>
            <div>
              <dt>Género registrado</dt>
              <dd>{profile.gender || 'Sin registrar'}</dd>
            </div>
            <div>
              <dt>Grupo sanguíneo declarado</dt>
              <dd>{profile.bloodType || 'Sin registrar'}</dd>
            </div>
            <div>
              <dt>Previsión</dt>
              <dd>{profile.healthInsurance || 'Sin registrar'}</dd>
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
      <Card title="Resultados de laboratorio" description="Valores extraídos de documentos guardados; compara siempre con el informe original y sus rangos.">
        {labReports.length === 0 ? <EmptyState title="Sin exámenes registrados" description="No hay resultados de laboratorio en esta ficha." /> : (
          <div className="mm-stack">
            {labReports.map((report) => <article className="mm-prescription" key={report.id}>
              <div className="mm-card-heading"><div><h3>{report.laboratory_name || 'Examen de laboratorio'}</h3><p>Muestra: {formatClinicalDate(report.sample_date)}</p></div>
                {report.document_id && onOpenFile && <Button variant="secondary" disabled={openingFileId === report.document_id} onClick={() => onOpenFile(report.document_id)}><ExternalLink size={15} /> Ver original</Button>}</div>
              {report.observations && <p className="mm-muted">Observaciones: {report.observations}</p>}
              {report.items?.length ? <div className="mm-table-scroll" role="region" aria-label={`Resultados de ${report.laboratory_name || 'laboratorio'}`} tabIndex={0}><table className="mm-clinical-table"><thead><tr><th scope="col">Parámetro</th><th scope="col">Resultado</th><th scope="col">Referencia</th></tr></thead><tbody>{report.items.map((item, index) => <tr key={item.id || index}><th scope="row">{item.test_name || 'No informado'}</th><td>{item.result_value || 'No informado'} {item.unit || ''}{item.is_abnormal && <span className="text-rose-600 dark:text-rose-300">Marcado como alterado</span>}</td><td>{item.reference_range || 'No informado'}</td></tr>)}</tbody></table></div> : <p className="mm-muted">El documento no contiene resultados estructurados.</p>}
            </article>)}
          </div>
        )}
      </Card>
      <Card title="Documentos originales" description="Archivos compartidos durante la vigencia de este permiso. La disponibilidad no equivale a revisión médica.">
        {fileError && <Notice title="No se pudo abrir el archivo">{fileError}</Notice>}
        {documents.length === 0 ? <EmptyState icon={FileText} title="Sin documentos compartidos" description="El paciente todavía no tiene documentos guardados en esta ficha." /> : (
          <div className="mm-stack">{documents.map((document) => <article className="mm-prescription" key={document.id}><div className="mm-card-heading"><div><h3>{document.title || document.file_name || 'Documento'}</h3><p>{({ RECETA: 'Receta médica', EXAMEN_LAB: 'Examen de laboratorio', INFORME: 'Informe', IMAGEN: 'Imagen' })[document.document_type] || 'Otro documento'} · {document.document_date ? 'Emitido' : 'Subido'} {formatClinicalDate(document.document_date || document.created_at)}</p></div>{onOpenFile && <Button variant="secondary" disabled={openingFileId === document.id} onClick={() => onOpenFile(document.id)}><ExternalLink size={15} /> {openingFileId === document.id ? 'Abriendo...' : 'Ver archivo'}</Button>}</div><dl className="mm-source-grid"><div><dt>Institución</dt><dd>{document.issuing_institution || 'No informada'}</dd></div><div><dt>Profesional</dt><dd>{document.issuing_doctor || 'No informado'}</dd></div><div><dt>Estado del registro</dt><dd>{document.status === 'PENDIENTE_REVISION' ? 'Pendiente de revisión' : 'Confirmado por el paciente'}</dd></div></dl></article>)}</div>
        )}
      </Card>
    </main>
  );
}
