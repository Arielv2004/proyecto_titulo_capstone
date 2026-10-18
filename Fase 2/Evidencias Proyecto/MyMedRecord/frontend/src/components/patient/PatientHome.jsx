import React from 'react';
import { ArrowRight, ArrowUpRight, QrCode, Share2, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { Button, Card, InfoPopover, LoadingState, Notice } from '../ui/ClinicalUI';

export function PatientHome({
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
  onCategory,
  categories,
}) {
  const activeAccesses = grants.filter((grant) => grant.status === 'ACTIVO' && !grant.isRevoked).length;

  return (
    <div className="mm-home mm-stack">
      <section className="mm-onboarding-hero" aria-labelledby="patient-home-title">
        <div className="mm-onboarding-intro">
          <h1 id="patient-home-title">Tu historial de salud en un solo lugar.</h1>
          <p className="mm-eyebrow">TU HISTORIAL MÉDICO DIGITAL</p>
          <p className="mm-home-intro">
            Guarda tus recetas, exámenes e informes en Mi ficha y compártelos
            con tu médico cuando los necesites.
          </p>
          <div className="mm-ai-spotlight">
            <span className="mm-ai-spotlight-icon"><Sparkles size={21} aria-hidden="true" /></span>
            <div>
              <strong>Digitaliza con IA + OCR</strong>
              <p>El OCR lee el texto y la IA ayuda a ordenar los datos extraídos. Tú los revisas antes de guardarlos.</p>
            </div>
          </div>
        </div>
        <div className="mm-onboarding-side">
          <div className="mm-onboarding-actions">
            <Button variant="inverse" onClick={onUpload}>
              <Upload size={18} />
              Subir documento
            </Button>
            <Button variant="hero-outline" onClick={onShare} aria-label="Dar acceso a un médico">
              <Share2 size={18} />
              <span className="mm-action-label-desktop">Dar acceso a un médico</span>
              <span className="mm-action-label-mobile">Compartir ficha</span>
            </Button>
          </div>
          <button type="button" className="mm-onboarding-records" onClick={onRecords}>
            Ver mi ficha y documentos
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
        <InfoPopover label="Cómo crear y compartir tu ficha">
          <ol>
            <li>Sube una receta, examen o informe. El OCR lee el texto y la IA ayuda a organizar los datos.</li>
            <li>Revísalo en Mi ficha y compara los datos extraídos con el documento original.</li>
            <li>Cuando lo necesites, elige un médico o muestra un QR para dar acceso temporal.</li>
          </ol>
        </InfoPopover>
      </section>

      <div className="mm-content-grid">
        <Card
          title="Documentos por tipo"
          description="Consulta tus documentos por categoría."
        >
          {loading ? (
            <LoadingState label="Cargando resumen de documentos" />
          ) : error ? (
            <Notice title="No pudimos cargar tus documentos" tone="danger">{error}</Notice>
          ) : (
            <div className="mm-category-tiles" aria-label="Documentos por categoría">
              {categories.map((item) => (
                <button key={item.id} type="button" onClick={() => onCategory(item.id)} aria-label={`${item.title}: ${item.count} documentos. Ver categoría`}>
                  <span className="mm-category-tile-top">
                    <span className="mm-category-icon"><item.icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </span>
                  <strong>{item.count}</strong>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Compartir con un médico"
          description="Elige cómo compartir tu ficha temporalmente."
          className="mm-share-card"
        >
          {loadingGrants ? (
            <LoadingState label="Cargando accesos" />
          ) : grantsError ? (
            <p className="mm-muted">No pudimos consultar los accesos actuales.</p>
          ) : (
            <div className="mm-share-status">
              <ShieldCheck size={20} aria-hidden="true" />
              <span>Accesos activos</span>
              <strong>{activeAccesses}</strong>
            </div>
          )}
          <div className="mm-share-actions">
            <Button onClick={onShare}>
              <Share2 size={17} />
              Elegir médico
            </Button>
            <Button variant="secondary" onClick={onQr}>
              <QrCode size={18} />
              Mostrar QR
            </Button>
          </div>
          <button type="button" className="mm-share-manage" onClick={onAccess}>
            Administrar accesos
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </Card>
      </div>
    </div>
  );
}
