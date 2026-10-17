import React from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Upload,
  Share2,
  QrCode,
  HeartPulse,
  ShieldCheck,
  Pill,
  Plus,
} from 'lucide-react';
import {
  Button,
  Card,
  DocumentStatus,
  EmptyState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../ui/ClinicalUI';

export function PatientHome({
  user,
  profile,
  profileLoading,
  profileError,
  documents,
  loading,
  error,
  treatments,
  grants,
  loadingGrants,
  grantsError,
  onUpload,
  onShare,
  onQr,
  onProfile,
  onRecords,
  onAccess,
  onDocument,
  onCategory,
  categories,
  saved,
}) {
  const pending = documents.filter((d) =>
    ['PENDIENTE', 'PENDIENTE_REVISION', 'ERROR'].includes(d.status),
  );
  const active = grants.filter((g) => g.status === 'ACTIVO' && !g.isRevoked);
  return (
    <div className="mm-home">
      <PageHeader
        eyebrow="TU ESPACIO DE SALUD"
        title={`Hola${user?.first_name ? `, ${user.first_name}` : ''}.`}
        description="Tu información de salud, contigo en cada consulta."
        actions={
          <Button onClick={onUpload}>
            <Plus size={18} />
            Subir documento
          </Button>
        }
      />

      {saved && (
        <Notice title="Tu ficha se guardó correctamente" tone="success">
          Puedes revisar tus antecedentes en Mi ficha.
        </Notice>
      )}
      {profileError ? (
        <Notice tone="danger" title="No pudimos cargar tu ficha">
          {profileError}
        </Notice>
      ) : (
        !profileLoading &&
        !profile.isCompleted && (
          <Notice
            tone="warning"
            title="Completa tu ficha de salud"
            action={
              <Button variant="secondary" onClick={onProfile}>
                Completar ficha
                <ArrowRight size={16} />
              </Button>
            }
          >
            Agrega tus antecedentes y un contacto para que estén disponibles cuando los necesites.
          </Notice>
        )
      )}

      <div className="mm-overview-grid">
        <section className="mm-health-card" aria-labelledby="health-overview-title">
          <div className="mm-health-card-top">
            <span className="mm-eyebrow">MI FICHA PERSONAL</span>
            <HeartPulse size={26} aria-hidden="true" />
          </div>
          <h2 id="health-overview-title">Lo importante, a mano.</h2>
          <p>Los antecedentes que has registrado para acompañar tu atención.</p>
          {profileLoading ? (
            <LoadingState label="Cargando antecedentes" />
          ) : profileError ? (
            <p>Antecedentes no disponibles.</p>
          ) : (
            <dl className="mm-health-facts">
              <div>
                <dt>Grupo sanguíneo</dt>
                <dd>{profile.bloodType || 'Sin registrar'}</dd>
              </div>
              <div>
                <dt>Previsión</dt>
                <dd>{profile.healthInsurance || 'Sin registrar'}</dd>
              </div>
            </dl>
          )}
          <Button variant="inverse" onClick={onProfile}>
            Ver mi ficha
            <ArrowUpRight size={18} />
          </Button>
          <span className="mm-health-footnote">Información declarada por ti</span>
        </section>

        <Card
          title="Comparte con tu médico"
          description="Tú decides quién puede consultar tu información y por cuánto tiempo."
          className="mm-share-card"
        >
          <span className="mm-icon">
            <Share2 size={26} aria-hidden="true" />
          </span>
          <div className="mm-share-actions">
            <Button onClick={onShare} variant="secondary">
              Elegir médico
              <ArrowRight size={17} />
            </Button>
            <Button variant="ghost" onClick={onQr}>
              <QrCode size={18} />
              Mostrar QR
            </Button>
          </div>
          <button type="button" className="mm-text-link mm-access-link" onClick={onAccess}>
            <ShieldCheck size={17} />
            {grantsError
              ? 'Consultar estado de accesos'
              : loadingGrants
                ? 'Cargando accesos…'
                : `${active.length} ${active.length === 1 ? 'acceso activo' : 'accesos activos'}`}
            <ArrowUpRight size={16} />
          </button>
        </Card>
      </div>

      <div className="mm-content-grid">
        <div className="mm-stack">
          <Card
            title="Actividad reciente"
            description="Tus últimos documentos, con su estado de revisión."
            action={
              <Button variant="ghost" onClick={onRecords}>
                Ver historial
                <ArrowRight size={16} />
              </Button>
            }
          >
            {loading ? (
              <LoadingState label="Cargando documentos" />
            ) : error ? (
              <Notice title="No pudimos cargar los documentos" tone="danger">
                {error}
              </Notice>
            ) : documents.length === 0 ? (
              <EmptyState
                title="Tu historial comienza aquí"
                description="Sube una receta o un examen. Podrás revisar los datos antes de guardarlos."
                action={
                  <Button variant="secondary" onClick={onUpload}>
                    <Upload size={16} />
                    Subir mi primer documento
                  </Button>
                }
              />
            ) : (
              <div className="mm-document-list">
                {documents.slice(0, 3).map((doc) => (
                  <button
                    type="button"
                    className="mm-document-row"
                    key={doc.id}
                    onClick={() => onDocument(doc)}
                  >
                    <span className="mm-icon">
                      <FileText size={22} aria-hidden="true" />
                    </span>
                    <span className="mm-document-copy">
                      <strong>{doc.title}</strong>
                      <span>{doc.institution}</span>
                      <span className="mm-caption">
                        {doc.extractedData?.fechaEmision
                          ? `Emitido ${doc.extractedData.fechaEmision}`
                          : `Subido ${doc.date}`}
                      </span>
                      <DocumentStatus status={doc.status} />
                    </span>
                    <ArrowUpRight size={18} className="mm-muted" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Medicamentos en tus recetas"
            description="Información registrada en documentos con fecha de vigencia disponible."
            action={
              <Button variant="ghost" onClick={() => onCategory('RECETA')}>
                Ver recetas
                <ArrowRight size={16} />
              </Button>
            }
          >
            {loading ? (
              <LoadingState />
            ) : error ? (
              <p className="mm-muted">No se pudieron consultar las recetas.</p>
            ) : treatments.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="Sin recetas vigentes para mostrar"
                description="Aquí aparecerán los medicamentos de tus recetas cuando exista una fecha de vigencia registrada."
              />
            ) : (
              <div className="mm-medication-list">
                {treatments.slice(0, 3).map((med, index) => {
                  const source = documents.find((d) => d.id === med.documentId);
                  return (
                    <div className="mm-medication" key={`${med.documentId}-${index}`}>
                      <Pill size={20} className="mm-accent" aria-hidden="true" />
                      <div>
                        <strong>{med.nombre || med.name}</strong>
                        <p>
                          {[med.dosis, med.posologia].filter((v) => v && v !== '—').join(' · ') ||
                            'Indicación no registrada'}
                        </p>
                        <span className="mm-caption">
                          Vigencia registrada: {med.validUntil || 'No informada'}
                        </span>
                        <DocumentStatus status={source?.status} />
                      </div>
                      {source && (
                        <Button
                          variant="ghost"
                          onClick={() => onDocument(source)}
                          aria-label={`Ver receta de ${med.nombre || med.name}`}
                        >
                          <ArrowUpRight size={18} />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {treatments.length > 3 && (
                  <Button variant="ghost" onClick={() => onCategory('RECETA')}>
                    Ver todos los medicamentos
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        <aside className="mm-stack" aria-label="Resumen y documentos">
          {!loading && !error && pending.length > 0 && (
            <Card title="Por revisar" className="mm-review-card">
              <StatusBadge tone="warning">
                {pending.length} {pending.length === 1 ? 'documento' : 'documentos'}
              </StatusBadge>
              <p>Comprueba la información extraída antes de usarla en una consulta.</p>
              <Button variant="secondary" onClick={() => onDocument(pending[0])}>
                Ver documento
                <ArrowRight size={16} />
              </Button>
            </Card>
          )}
          <Card title="Tus documentos" description="Encuentra lo que necesitas por categoría.">
            <div className="mm-category-list">
              {categories.map((item) => (
                <button key={item.id} type="button" onClick={() => onCategory(item.id)}>
                  <item.icon size={20} aria-hidden="true" />
                  <span>{item.title}</span>
                  <span className="mm-count">{loading || error ? '—' : item.count}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          </Card>
          <Card title="Antecedentes de salud" description="Declarados por ti en Mi ficha.">
            {profileLoading ? (
              <LoadingState />
            ) : profileError ? (
              <p className="mm-muted">Antecedentes no disponibles.</p>
            ) : (
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
            )}
            <Button variant="ghost" onClick={onProfile}>
              Revisar antecedentes
              <ArrowUpRight size={16} />
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
