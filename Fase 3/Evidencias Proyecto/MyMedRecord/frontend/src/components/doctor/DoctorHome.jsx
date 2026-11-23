import React, { useState } from 'react';
import { ArrowRight, Search, Users } from 'lucide-react';
import { formatPermissionDuration } from '../../utils/permissionDuration';
import {
  Button,
  Card,
  EmptyState,
  InfoPopover,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../ui/ClinicalUI';

export function DoctorHome({ shares, loading, error, onOpen }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('TODOS');
  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f.\-\s]/g, '')
      .toLowerCase();
  const active = shares.filter((g) => g.status === 'ACTIVO' && !g.isRevoked);
  const filtered = shares.filter((g) =>
    (status === 'TODOS' || (status === 'REVOCADO' ? g.isRevoked : g.status === status && !g.isRevoked)) &&
    normalize(`${g.patient?.firstName} ${g.patient?.lastName} ${g.patient?.rut}`).includes(normalize(query)),
  );
  return (
    <div className="mm-stack">
      <PageHeader
        eyebrow="PORTAL MÉDICO"
        title="Prepara tu próxima consulta."
        hideTitle
        description="Encuentra las fichas que tus pacientes han compartido contigo."
        actions={
          <InfoPopover label="Acceso bajo consentimiento">
            <p>Solo aparecen las fichas que los pacientes han compartido contigo. Puedes abrirlas mientras su permiso esté vigente.</p>
          </InfoPopover>
        }
      />
      <div className="mm-doctor-stats" aria-label="Resumen de permisos recibidos">
        {[
          ['Accesos activos', active.length],
          ['Otros permisos', shares.length - active.length],
          ['Permisos recibidos', shares.length],
        ].map(([label, count]) => (
          <div className="mm-stat" key={label}>
            <strong>{loading || error ? '—' : count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <Card
        title="Fichas compartidas contigo"
        description="La autorización del paciente se comprueba al abrir cada ficha."
        action={
          <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Estado del permiso
            <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-body">
              <option value="TODOS">Todos</option>
              <option value="ACTIVO">Vigentes</option>
              <option value="EXPIRADO">Vencidos</option>
              <option value="REVOCADO">Revocados</option>
            </select>
          </label>
        }
      >
        <label className="mm-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Buscar paciente por nombre o RUT</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o RUT"
          />
        </label>
        {loading ? (
          <LoadingState label="Consultando permisos de acceso" />
        ) : error ? (
          <div className="mt-4">
            <Notice title="No pudimos cargar las fichas" tone="danger">
              {error}
            </Notice>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query || status !== 'TODOS' ? 'No encontramos coincidencias' : 'Aún no tienes fichas compartidas'}
            description={
              query
                ? 'Prueba con otro nombre o RUT dentro de los permisos recibidos.'
                : status !== 'TODOS' ? 'No hay permisos en este estado.' : 'Cuando un paciente comparta su ficha contigo, aparecerá aquí.'
            }
            action={
              query ? (
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Limpiar búsqueda
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="mm-patient-list">
            {filtered.map((grant) => {
              const available = grant.status === 'ACTIVO' && !grant.isRevoked;
              return (
                <article className="mm-patient-row" key={grant.id}>
                  <div className="mm-patient-identity">
                    <span className="mm-icon">
                      <Users size={22} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>
                        {[grant.patient?.firstName, grant.patient?.lastName]
                          .filter(Boolean)
                          .join(' ') || 'Nombre no informado'}
                      </h3>
                      <p className="mm-caption">RUT {grant.patient?.rut || 'no informado'}</p>
                    </div>
                  </div>
                  <div className="mm-stack mm-permission">
                    <StatusBadge tone={available ? 'success' : 'neutral'}>
                      {available
                        ? 'Consentimiento vigente'
                        : grant.isRevoked
                          ? 'Permiso revocado'
                          : 'Sin autorización vigente'}
                    </StatusBadge>
                    {grant.expiresAt && <span className="mm-caption">Vence {new Date(grant.expiresAt).toLocaleString('es-CL')}</span>}
                    <span className="mm-caption">
                      {available
                        ? `Tiempo restante: ${formatPermissionDuration(grant.minutesRemaining)}`
                        : 'Se requiere un nuevo permiso'}
                    </span>
                  </div>
                  <Button variant="secondary" disabled={!available} onClick={() => onOpen(grant)}>
                    Abrir ficha
                    <ArrowRight size={16} />
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
