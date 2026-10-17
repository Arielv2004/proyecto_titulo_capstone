import React from 'react';
import { ArrowRight, ArrowUpRight, FileText, QrCode, Share2, ShieldCheck, Upload } from 'lucide-react';
import { Button, Card, EmptyState, LoadingState, Notice } from '../ui/ClinicalUI';

export function PatientHome({
  documents,
  loading,
  error,
  grants,
  loadingGrants,
  grantsError,
  onUpload,
  onShare,
  onQr,
  onRecords,
  onAccess,
  onDocument,
  onCategory,
  categories,
}) {
  const active = grants.filter((grant) => grant.status === 'ACTIVO' && !grant.isRevoked);

  return (
    <div className="mm-home mm-stack">
      <section className="mm-onboarding-hero" aria-labelledby="patient-home-title">
        <div className="mm-onboarding-intro">
          <p className="mm-eyebrow">TU HISTORIAL MÉDICO DIGITAL</p>
          <h1 id="patient-home-title">Tu historia de salud, en un solo lugar.</h1>
          <p>
            Reúne tus recetas, exámenes e informes en Mi ficha. Cuando lo necesites,
            da acceso a un médico a la información disponible para consulta.
          </p>
          <div className="mm-onboarding-actions">
            <Button variant="inverse" onClick={onUpload}>
              <Upload size={18} />
              Subir documento
            </Button>
            <Button variant="hero-outline" onClick={onShare}>
              <Share2 size={18} />
              Dar acceso a un médico
            </Button>
          </div>
          <button type="button" className="mm-onboarding-records" onClick={onRecords}>
            Ver mi ficha y documentos
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="mm-onboarding-steps" aria-label="Cómo funciona tu ficha">
          <p className="mm-onboarding-steps-title">Empieza con estos pasos</p>
          <ol>
            <li><span>1</span><div><strong>Sube tus documentos</strong><p>Agrega recetas, exámenes o informes que ya tienes.</p></div></li>
            <li><span>2</span><div><strong>Encuéntralos en Mi ficha</strong><p>Consulta lo que has guardado en tu historial.</p></div></li>
            <li><span>3</span><div><strong>Da acceso al consultar</strong><p>Elige a qué médico compartir la información disponible.</p></div></li>
          </ol>
        </div>
      </section>

      <div className="mm-content-grid">
        <Card
          title="Tu ficha"
          description="Los documentos que has subido recientemente, con su fecha y procedencia."
          action={
            <Button variant="ghost" onClick={onRecords}>
              Ver todo mi historial
              <ArrowRight size={16} />
            </Button>
          }
        >
          {loading ? (
            <LoadingState label="Cargando documentos" />
          ) : error ? (
            <Notice title="No pudimos cargar tus documentos" tone="danger">{error}</Notice>
          ) : documents.length === 0 ? (
            <EmptyState
              title="Tu historial comienza aquí"
              description="Sube una receta, un examen o un informe para empezar a reunir tus documentos de salud."
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
                <button type="button" className="mm-document-row" key={doc.id} onClick={() => onDocument(doc)}>
                  <span className="mm-icon"><FileText size={22} aria-hidden="true" /></span>
                  <span className="mm-document-copy">
                    <strong>{doc.title}</strong>
                    <span>{doc.institution || 'Institución no informada'}</span>
                    <span className="mm-caption">
                      {doc.extractedData?.fechaEmision
                        ? `Emitido ${doc.extractedData.fechaEmision}`
                        : `Subido ${doc.date}`}
                    </span>
                  </span>
                  <ArrowUpRight size={18} className="mm-muted" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <aside className="mm-stack" aria-label="Compartir y buscar documentos">
          <Card
            title="Compartir con un médico"
            description="Tú eliges quién puede consultar tus antecedentes y recetas disponibles, y durante cuánto tiempo."
            className="mm-share-card"
          >
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
                ? 'Consultar accesos'
                : loadingGrants
                  ? 'Cargando accesos…'
                  : `${active.length} ${active.length === 1 ? 'acceso activo' : 'accesos activos'}`}
              <ArrowUpRight size={16} />
            </button>
          </Card>
          <Card title="Buscar por tipo de documento" description="Ve directamente a una categoría de tu ficha.">
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
        </aside>
      </div>
    </div>
  );
}
