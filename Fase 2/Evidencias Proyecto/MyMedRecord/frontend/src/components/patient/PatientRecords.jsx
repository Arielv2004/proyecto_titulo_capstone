import React, { useEffect, useRef } from 'react';
import { FileText, Search, Upload, ArrowUpRight, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  DocumentStatus,
  EmptyState,
  InfoPopover,
  LoadingState,
  Notice,
} from '../ui/ClinicalUI';

export function PatientRecords({
  documents,
  filtered,
  categories,
  category,
  onCategory,
  query,
  onQuery,
  loading,
  error,
  onUpload,
  onDocument,
  onDelete,
}) {
  const filterListRef = useRef(null);

  useEffect(() => {
    const list = filterListRef.current;
    const selected = list?.querySelector('[aria-pressed="true"]');
    if (!list || !selected) return;

    // Keep the category opened from Inicio visible in the mobile filter strip.
    const listLeft = list.getBoundingClientRect().left;
    const selectedLeft = selected.getBoundingClientRect().left;
    list.scrollLeft += selectedLeft - listLeft - (list.clientWidth - selected.clientWidth) / 2;
  }, [category]);

  return (
    <div className="mm-records mm-stack">
      <header className="mm-records-header">
        <div className="mm-records-heading">
          <p className="mm-eyebrow">TU HISTORIAL</p>
          <h1 className="sr-only">Mi ficha</h1>
        </div>
        <div className="mm-records-controls">
          <Button onClick={onUpload}>
            <Upload size={18} />
            Subir documento
          </Button>
          <InfoPopover label="Cómo usar Mi ficha">
            <p>Usa la búsqueda o elige un tipo para encontrar un documento. Abre cada registro para consultar su archivo y los datos disponibles.</p>
            <p>«Documento guardado» indica que se almacenó en tu ficha; no significa que un médico haya revisado su contenido. Contrasta los datos extraídos con el original.</p>
          </InfoPopover>
        </div>
      </header>
      <Card className="mm-records-panel">
        <label className="mm-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Buscar documentos por título, médico o institución</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar en mi ficha"
          />
        </label>
        <div ref={filterListRef} className="mm-filter-list" role="group" aria-label="Filtrar documentos por categoría">
          {[{ id: 'ALL', title: 'Todos', count: documents.length }, ...categories].map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => onCategory(item.id)}
            >
              {item.title}
              <span>{loading || error ? '—' : item.count}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <LoadingState label="Cargando documentos" />
        ) : error ? (
          <Notice
            title="No pudimos cargar los documentos"
            tone="danger"
            action={
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Notice>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              documents.length ? 'No encontramos coincidencias' : 'Aún no has subido documentos'
            }
            description={
              documents.length
                ? 'Prueba con otra búsqueda o categoría.'
                : 'Agrega tu primera receta, examen o informe para comenzar tu historial.'
            }
            action={
              documents.length ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onQuery('');
                    onCategory('ALL');
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : (
                <Button onClick={onUpload}>Subir mi primer documento</Button>
              )
            }
          />
        ) : (
          <div className="mm-record-list">
            {filtered.map((doc) => (
              <article key={doc.id} className="mm-record">
                <div className="mm-record-heading">
                  <span className="mm-icon">
                    <FileText size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="mm-eyebrow">
                      {categories.find((c) => c.id === doc.category)?.title || 'Documento'}
                    </p>
                    <h2>{doc.title}</h2>
                    <p className="mm-caption">Subido {doc.date}</p>
                  </div>
                </div>
                <dl className="mm-source-grid">
                  <div>
                    <dt>Institución</dt>
                    <dd>{doc.institution || 'No informada'}</dd>
                  </div>
                  <div>
                    <dt>Profesional</dt>
                    <dd>{doc.doctor || 'No informado'}</dd>
                  </div>
                  <div>
                    <dt>Fecha de emisión</dt>
                    <dd>{doc.extractedData?.fechaEmision || 'No informada'}</dd>
                  </div>
                </dl>
                <div className="mm-record-footer">
                  <DocumentStatus status={doc.status} />
                  {doc.extractedData?.vigenciaHasta && (
                    <span className="mm-caption">
                      Vigencia registrada: {doc.extractedData.vigenciaHasta}
                    </span>
                  )}
                  {doc.status === 'ERROR' ? (
                    <Button variant="secondary" onClick={() => onDelete(doc)}>
                      <Trash2 size={16} />
                      Eliminar documento con error
                    </Button>
                  ) : (
                    <Button className="mm-record-view-button" variant="secondary" onClick={() => onDocument(doc)}>
                      Ver documento
                      <ArrowUpRight size={16} />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
