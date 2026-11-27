import React, { useState } from 'react';
import {
  Pill,
  Pause,
  Trash2,
  Play,
  Upload,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Stethoscope,
  Info,
} from 'lucide-react';
import { Button } from '../ui/ClinicalUI';

export function ActiveTreatmentsBanner({
  documents = [],
  loading = false,
  onStatusChange,
  onUpload,
}) {
  const [confirmAction, setConfirmAction] = useState(null); // { prescriptionId, docTitle, status: 'PAUSADO' | 'ELIMINADO' | 'ACTIVA', prescriptionName }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showPausedSection, setShowPausedSection] = useState(false);
  const [expandedTreatmentIds, setExpandedTreatmentIds] = useState(new Set());

  // Formato de fecha actual YYYY-MM-DD local para comparación estricta
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Helper para obtener timestamp de emisión/creación para ordenamiento
  const getDocDate = (doc) => {
    const rx = doc.structured || {};
    const dateVal =
      rx.issue_date ||
      doc.documentDateRaw ||
      doc.extractedData?.issueDateRaw ||
      doc.created_at;
    return dateVal ? new Date(dateVal).getTime() : 0;
  };

  // Filtrar recetas médicas
  const prescriptionsDocs = (documents || []).filter(
    (doc) => doc.documentType === 'RECETA' || doc.category === 'RECETA'
  );

  // Recetas activas: status === 'ACTIVA' y (valid_until >= hoy o es crónica sin fecha)
  const activeTreatments = prescriptionsDocs.filter((doc) => {
    const rx = doc.structured || {};
    const status = rx.status || doc.status;
    if (status !== 'ACTIVA') return false;

    const validUntilRaw = rx.valid_until || doc.validUntilRaw;
    if (!validUntilRaw) {
      return Boolean(rx.is_chronic);
    }
    const datePart = String(validUntilRaw).slice(0, 10);
    return datePart >= todayStr;
  });

  // Ordenar cronológicamente (la más reciente primero)
  activeTreatments.sort((a, b) => getDocDate(b) - getDocDate(a));

  // Separar receta destacada (índice 0) de las recetas adicionales (índice 1+)
  const primaryTreatment = activeTreatments[0] || null;
  const otherTreatments = activeTreatments.slice(1);

  // Recetas pausadas: status === 'PAUSADO'
  const pausedTreatments = prescriptionsDocs.filter((doc) => {
    const rx = doc.structured || {};
    const status = rx.status || doc.status;
    return status === 'PAUSADO';
  });

  const toggleExpandTreatment = (id) => {
    setExpandedTreatmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmSubmit = async () => {
    if (!confirmAction?.prescriptionId || !onStatusChange) return;
    try {
      setIsSubmitting(true);
      setActionError('');
      await onStatusChange(confirmAction.prescriptionId, confirmAction.status);
      setConfirmAction(null);
    } catch (err) {
      console.error('Error al actualizar estado del tratamiento:', err);
      setActionError(
        err.response?.data?.message ||
          'No se pudo actualizar el estado del tratamiento. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para obtener medicamentos limpios de un documento
  const getMedicationsList = (doc) => {
    if (doc.extractedData?.medicamentos?.length) {
      return doc.extractedData.medicamentos;
    }
    if (doc.structured?.items?.length) {
      return doc.structured.items.map((it) => ({
        name: it.medication_name,
        dosage: it.dosage || '—',
        frequency: it.frequency || '—',
        duration: it.duration || '—',
        instructions: it.instructions || '—',
      }));
    }
    return [];
  };

  // Helper para extraer diagnóstico limpio
  const getDiagnosisText = (doc) => {
    const rx = doc.structured || {};
    const raw = rx.diagnosis_text || doc.extractedData?.diagnostico || '';
    if (
      !raw ||
      raw === 'Sin diagnóstico registrado' ||
      raw === 'Sin diagnóstico clínico'
    ) {
      return null;
    }
    return raw;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface/70 dark:bg-surface/50 animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-surface-muted" />
          <div className="h-4 w-48 rounded bg-surface-muted" />
        </div>
        <div className="h-14 rounded-xl bg-surface-muted" />
      </div>
    );
  }

  // ESTADO VACÍO: Si NO hay tratamientos activos
  if (activeTreatments.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-transparent p-5 sm:p-6 transition-all shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/30">
              <Pill size={22} strokeWidth={2.2} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
                  Plan Farmacológico
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-surface-muted text-muted">
                  0 Activos
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-ink">
                No tienes tratamientos activos actualmente
              </h2>
              <p className="text-xs sm:text-sm text-muted max-w-xl">
                Sube tu receta médica para que el OCR y la IA digitalicen tus medicamentos,
                dosis y vigencias de forma automática.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
            <Button
              variant="primary"
              onClick={onUpload}
              className="w-full sm:w-auto justify-center shadow-xs"
            >
              <Upload size={17} />
              Subir nueva receta
            </Button>
          </div>
        </div>

        {/* Si existen tratamientos pausados, permitir desplegarlos y reactivarlos */}
        {pausedTreatments.length > 0 && renderPausedTreatments()}

        {/* Modal de confirmación */}
        {renderConfirmModal()}
      </div>
    );
  }

  // ESTADO ACTIVO: Se muestra tarjeta destacada para la primera receta y lista compacta para las demás
  const rxPrimary = primaryTreatment.structured || {};
  const prescriptionIdPrimary = rxPrimary.id;
  const medsPrimary = getMedicationsList(primaryTreatment);
  const validUntilStrPrimary = primaryTreatment.validUntil || rxPrimary.valid_until;
  const doctorNamePrimary = rxPrimary.doctor_name || primaryTreatment.doctor;
  const isChronicPrimary = Boolean(rxPrimary.is_chronic);
  const diagnosisPrimary = getDiagnosisText(primaryTreatment);

  return (
    <section aria-label="Tratamientos activos" className="space-y-4">
      {/* Encabezado General */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Pill size={16} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-ink flex items-center gap-2">
              <span>Tratamientos Activos</span>
              <span className="px-2 py-0.2 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {activeTreatments.length}
              </span>
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onUpload}
          className="text-xs font-bold text-accent-ink hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Upload size={14} />
          <span>Subir otra receta</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECCIÓN DESTACADA (LA PRIMERA RECETA) */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl border-2 border-emerald-500/35 bg-surface dark:bg-surface/90 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all space-y-4">
        {/* Cabecera de la Tarjeta Principal */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-line/70">
          <div className="space-y-1.5 min-w-0">
            {/* Badges de estado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 size={13} />
                Tratamiento Principal
              </span>
              {isChronicPrimary && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300">
                  Uso Crónico
                </span>
              )}
            </div>

            {/* Título principal en grande: Usar el document.title que generó la IA */}
            <h3 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight pt-0.5">
              {primaryTreatment.title || 'Receta Médica'}
            </h3>

            {/* Diagnóstico si está disponible como subtítulo */}
            {diagnosisPrimary && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-ink/80 font-medium pt-0.5">
                <Stethoscope size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Diagnóstico: <strong className="text-ink font-semibold">{diagnosisPrimary}</strong>
                </span>
              </div>
            )}

            {/* Metadatos: Médico y Fecha de término */}
            <div className="flex items-center gap-3 text-xs text-muted flex-wrap pt-0.5">
              {doctorNamePrimary && doctorNamePrimary !== '—' && (
                <span className="flex items-center gap-1">
                  <User size={13} />
                  <span>Dr(a). <strong>{doctorNamePrimary}</strong></span>
                </span>
              )}
              {validUntilStrPrimary && (
                <span className="flex items-center gap-1 font-mono text-emerald-800 dark:text-emerald-400 font-semibold">
                  <Calendar size={13} />
                  Vigente hasta: {validUntilStrPrimary}
                </span>
              )}
            </div>
          </div>

          {/* Botones de Acción: Pausar y Eliminar */}
          <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
            <button
              type="button"
              onClick={() =>
                setConfirmAction({
                  prescriptionId: prescriptionIdPrimary,
                  docTitle: primaryTreatment.title,
                  status: 'PAUSADO',
                  prescriptionName: primaryTreatment.title || medsPrimary[0]?.name || 'Receta médica',
                })
              }
              className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
              title="Pausar este tratamiento temporalmente"
            >
              <Pause size={13} />
              <span>Pausar</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setConfirmAction({
                  prescriptionId: prescriptionIdPrimary,
                  docTitle: primaryTreatment.title,
                  status: 'ELIMINADO',
                  prescriptionName: primaryTreatment.title || medsPrimary[0]?.name || 'Receta médica',
                })
              }
              className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800/80 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
              title="Eliminar este tratamiento del plan activo"
            >
              <Trash2 size={13} />
              <span>Eliminar</span>
            </button>
          </div>
        </div>

        {/* Lista Completa de Medicamentos y Horarios */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted block">
            Medicamentos y Posología
          </span>
          {medsPrimary.length === 0 ? (
            <p className="text-xs text-muted italic">
              Sin medicamentos detallados en esta receta.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {medsPrimary.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-canvas/80 border border-line/80 dark:bg-surface-muted/60 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      {med.name}
                    </span>
                    {med.dosage && med.dosage !== '—' && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-surface text-body border border-line shrink-0">
                        {med.dosage}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-body space-y-0.5 pl-3.5">
                    {med.frequency && med.frequency !== '—' && (
                      <div className="flex items-center gap-1.5 text-muted">
                        <Clock size={12} className="shrink-0 text-accent-ink" />
                        <span>{med.frequency}</span>
                      </div>
                    )}
                    {med.duration && med.duration !== '—' && (
                      <div className="flex items-center gap-1.5 text-muted">
                        <Calendar size={12} className="shrink-0 text-emerald-600" />
                        <span>Duración: {med.duration}</span>
                      </div>
                    )}
                    {med.instructions && med.instructions !== '—' && (
                      <div className="text-[11px] text-muted italic pt-0.5">
                        {med.instructions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECCIÓN DE LISTA (RECETAS ADICIONALES) */}
      {/* ========================================================================= */}
      {otherTreatments.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-extrabold text-ink flex items-center gap-1.5">
              <span>Otros tratamientos activos</span>
              <span className="px-2 py-0.2 rounded-full text-[11px] font-bold bg-surface-muted text-muted">
                {otherTreatments.length}
              </span>
            </h3>
          </div>

          <div className="space-y-2">
            {otherTreatments.map((doc) => {
              const rx = doc.structured || {};
              const prescriptionId = rx.id;
              const meds = getMedicationsList(doc);
              const isExpanded = expandedTreatmentIds.has(doc.id);
              const validUntilStr = doc.validUntil || rx.valid_until;
              const doctorName = rx.doctor_name || doc.doctor;
              const diagnosis = getDiagnosisText(doc);

              return (
                <div
                  key={doc.id}
                  className="rounded-xl border border-line bg-surface dark:bg-surface/80 hover:border-emerald-500/40 transition-all p-3 sm:p-3.5 space-y-2.5"
                >
                  {/* Fila Principal Compacta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 space-y-1">
                      {/* Título de la receta adicional con el document.title que generó la IA */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 uppercase">
                          Activo
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-ink truncate">
                          {doc.title || 'Receta Médica'}
                        </h4>
                        {meds.length > 0 && (
                          <span className="text-[11px] font-semibold text-muted bg-surface-muted px-1.5 py-0.2 rounded">
                            {meds.length} {meds.length === 1 ? 'medicamento' : 'medicamentos'}
                          </span>
                        )}
                      </div>

                      {/* Diagnóstico si está disponible */}
                      {diagnosis && (
                        <div className="flex items-center gap-1.5 text-xs text-ink/80 font-medium">
                          <Stethoscope size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">
                            Diagnóstico: <strong className="text-ink font-semibold">{diagnosis}</strong>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted flex-wrap">
                        {doctorName && doctorName !== '—' && (
                          <span className="flex items-center gap-1 truncate">
                            <User size={12} />
                            <span>Dr(a). {doctorName}</span>
                          </span>
                        )}
                        {validUntilStr && (
                          <span className="flex items-center gap-1 font-mono text-emerald-800 dark:text-emerald-400 font-semibold">
                            <Calendar size={12} />
                            Término: {validUntilStr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones de la Tarjeta Compacta */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpandTreatment(doc.id)}
                        className="px-2.5 py-1 rounded-lg border border-line bg-surface-muted hover:bg-line/60 text-ink text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title={isExpanded ? 'Ocultar detalle de medicamentos' : 'Ver detalle de medicamentos'}
                      >
                        <span>{isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            prescriptionId,
                            docTitle: doc.title,
                            status: 'PAUSADO',
                            prescriptionName: doc.title || meds[0]?.name || 'Receta médica',
                          })
                        }
                        className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Pausar este tratamiento"
                      >
                        <Pause size={12} />
                        <span className="hidden sm:inline">Pausar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            prescriptionId,
                            docTitle: doc.title,
                            status: 'ELIMINADO',
                            prescriptionName: doc.title || meds[0]?.name || 'Receta médica',
                          })
                        }
                        className="px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Eliminar este tratamiento"
                      >
                        <Trash2 size={12} />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </div>

                  {/* Sección Expandible con el detalle completo */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-line/60 space-y-2 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {meds.map((med, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-canvas/70 border border-line text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1.5 font-bold text-ink">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {med.name}
                              </span>
                              {med.dosage && med.dosage !== '—' && (
                                <span className="font-mono text-[11px] text-muted">
                                  {med.dosage}
                                </span>
                              )}
                            </div>
                            {med.frequency && med.frequency !== '—' && (
                              <p className="text-muted text-[11px] pl-2.5">
                                Horario: {med.frequency}
                              </p>
                            )}
                            {med.instructions && med.instructions !== '—' && (
                              <p className="text-muted text-[11px] italic pl-2.5">
                                {med.instructions}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sección Colapsable para Tratamientos Pausados */}
      {pausedTreatments.length > 0 && renderPausedTreatments()}

      {/* Modal de confirmación */}
      {renderConfirmModal()}
    </section>
  );

  // Helper de Render para Tratamientos Pausados
  function renderPausedTreatments() {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowPausedSection(!showPausedSection)}
          className="text-xs font-bold text-muted hover:text-ink flex items-center gap-1.5 transition-colors cursor-pointer py-1"
        >
          <Pause size={14} className="text-amber-600 dark:text-amber-400" />
          <span>Tratamientos en pausa ({pausedTreatments.length})</span>
          {showPausedSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showPausedSection && (
          <div className="mt-2.5 space-y-2">
            {pausedTreatments.map((doc) => {
              const prescriptionId = doc.structured?.id;
              const meds = getMedicationsList(doc);
              const mainMedName = meds[0]?.name || doc.title;
              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-surface border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold uppercase">
                        Pausado
                      </span>
                      <strong className="text-ink truncate">{doc.title}</strong>
                    </div>
                    <p className="text-muted text-[11px] truncate">
                      {meds.map((m) => m.name).join(', ') || 'Sin medicamentos'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({
                          prescriptionId,
                          docTitle: doc.title,
                          status: 'ACTIVA',
                          prescriptionName: mainMedName,
                        })
                      }
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Play size={13} />
                      Reanudar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({
                          prescriptionId,
                          docTitle: doc.title,
                          status: 'ELIMINADO',
                          prescriptionName: mainMedName,
                        })
                      }
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Helper de Render del Modal de Confirmación
  function renderConfirmModal() {
    if (!confirmAction) return null;

    const isPause = confirmAction.status === 'PAUSADO';
    const isResume = confirmAction.status === 'ACTIVA';
    const isDelete = confirmAction.status === 'ELIMINADO';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
      >
        <div className="w-full max-w-md bg-surface rounded-2xl border border-line shadow-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDelete
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                  : isPause
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              {isDelete ? (
                <Trash2 size={20} />
              ) : isPause ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </div>

            <div className="space-y-1">
              <h3 id="confirm-action-title" className="text-base font-extrabold text-ink">
                {isDelete
                  ? '¿Eliminar tratamiento?'
                  : isPause
                    ? '¿Pausar tratamiento?'
                    : '¿Reanudar tratamiento?'}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {isDelete && (
                  <>
                    Esta acción retirará la receta de tus tratamientos activos. El cambio
                    quedará registrado en tu <strong>bitácora de auditoría</strong> según
                    la Ley N° 21.668.
                  </>
                )}
                {isPause && (
                  <>
                    El tratamiento quedará marcado como pausado. No aparecerá como activo, pero
                    podrás reanudarlo cuando tu médico lo indique.
                  </>
                )}
                {isResume && (
                  <>
                    El tratamiento volverá a mostrarse en tus recetas y tratamientos activos.
                  </>
                )}
              </p>
            </div>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmAction(null);
                setActionError('');
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isDelete
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50'
                  : isPause
                    ? 'bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50'
              }`}
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : isDelete ? (
                <>
                  <Trash2 size={15} />
                  <span>Sí, eliminar</span>
                </>
              ) : isPause ? (
                <>
                  <Pause size={15} />
                  <span>Sí, pausar</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>Sí, reanudar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
