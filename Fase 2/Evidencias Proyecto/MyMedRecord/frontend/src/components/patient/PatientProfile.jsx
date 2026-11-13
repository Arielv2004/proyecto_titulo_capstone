import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Download, Trash2, ShieldAlert, CheckCircle2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { Button, Card, InfoPopover, LoadingState, Notice, PageHeader } from '../ui/ClinicalUI';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { userApi } from '../../services/userApi';
import { formatBirthDateWithAge } from '../../utils/clinicalDate';
import { useAuthStore } from '../../store/useAuthStore';

export function PatientProfile({ user, profile, loading, error, onEdit, saved }) {
  const navigate = useNavigate();
  const { clearSession } = useAuthStore();

  // Estados para portabilidad y eliminación
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      setExportSuccess(false);
      await userApi.exportMyData();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 6000);
    } catch (err) {
      console.error('Error al exportar datos:', err);
      setExportError(err.response?.data?.message || 'No fue posible exportar tu información clínica.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      setReportError(null);
      setReportSuccess(false);
      await userApi.downloadClinicalReport();
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 6000);
    } catch (err) {
      console.error('Error al generar informe PDF:', err);
      setReportError(err.response?.data?.message || 'No fue posible generar el informe clínico en PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDeleteConfirm = async ({ confirmation, password }) => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await userApi.deleteMyAccount({ confirmation, password });

      // Limpiar caches de localStorage vinculados al paciente
      try {
        localStorage.removeItem('mymedrecord_patient_profile');
        localStorage.removeItem('mymedrecord_auth');
      } catch (e) {
        // Ignorar
      }

      setDeleteModalOpen(false);
      clearSession();
      navigate('/login', {
        replace: true,
        state: { accountDeleted: true },
      });
    } catch (err) {
      console.error('Error al eliminar cuenta:', err);
      setDeleteError(err.response?.data?.message || 'Error al eliminar la cuenta.');
    } finally {
      setDeleting(false);
    }
  };
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
                  <div><dt>Fecha de nacimiento</dt><dd>{formatBirthDateWithAge(profile.birthDate)}</dd></div>
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
              <section className="mm-profile-section mm-profile-section--emergency" aria-labelledby="profile-emergency-title">
                <h3 id="profile-emergency-title">Contacto de emergencia</h3>
                <dl className="mm-profile-fields">
                  <div><dt>Nombre</dt><dd>{profile.emergencyContactName || 'No registrado'}</dd></div>
                  <div><dt>Teléfono</dt><dd>{profile.emergencyContactPhone || 'No registrado'}</dd></div>
                </dl>
              </section>
            </div>
          </Card>

          {/* Sección Ley 21.719: Privacidad, Portabilidad y Derecho al Olvido */}
          <Card className="mm-profile-card border-rose-200/80 dark:border-rose-900/40" title="Privacidad y Gestión de Datos (Ley N° 21.719)">
            <div className="space-y-6 pt-2">
              {/* Notificaciones de exportación */}
              {exportSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Tu expediente clínico ha sido exportado exitosamente en formato JSON.</span>
                </div>
              )}

              {exportError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{exportError}</span>
                </div>
              )}

              {/* Notificaciones de informe clínico PDF */}
              {reportSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Informe clínico unificado en PDF generado y descargado exitosamente.</span>
                </div>
              )}

              {reportError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{reportError}</span>
                </div>
              )}

              {/* Informe Clínico PDF con IA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Informe Clínico Oficial (PDF con IA)
                  </h4>
                  <p className="text-xs text-teal-950/80 dark:text-teal-200/80 max-w-xl leading-relaxed">
                    Genera un documento PDF formal con tu ficha consolidada, tablas de prescripciones, exámenes paraclínicos y una síntesis narrativa redactada por IA (Gemini) en tono médico.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={downloadingReport}
                  className="px-4 py-2.5 rounded-xl bg-action hover:bg-action-hover active:scale-[0.99] text-xs font-bold text-on-action flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                >
                  <FileText className="w-4 h-4 text-teal-300" />
                  <span>{downloadingReport ? 'Generando informe...' : 'Descargar Informe (PDF)'}</span>
                </button>
              </div>

              {/* Portabilidad */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-muted/60 dark:bg-surface-muted/30 border border-line">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-ink dark:text-ink flex items-center gap-2">
                    <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Portabilidad de Datos
                  </h4>
                  <p className="text-xs text-muted dark:text-muted max-w-xl leading-relaxed">
                    Obtén una copia completa y estructurada de tus antecedentes clínicos, documentos digitalizados, recetas médicas, órdenes de exámenes y registros de auditoría en formato JSON interoperable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2.5 rounded-xl border border-line dark:border-line bg-surface hover:bg-surface-muted active:scale-[0.99] text-xs font-bold text-ink dark:text-ink flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                >
                  <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{exporting ? 'Generando exportación...' : 'Exportar mis datos (JSON)'}</span>
                </button>
              </div>

              {/* Zona de peligro: Eliminación / Olvido */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Zona de Peligro · Cancelación de Datos
                  </h4>
                  <p className="text-xs text-rose-900/80 dark:text-rose-200/80 max-w-xl leading-relaxed">
                    Ejerce tu derecho a la supresión definitiva (Derecho al Olvido). Se eliminarán tu cuenta, ficha médica, antecedentes clínicos y archivos originales en Supabase Storage de forma permanente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar mi cuenta</span>
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal de confirmación para eliminar cuenta */}
      <DeleteAccountDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleting) setDeleteModalOpen(false);
        }}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
        error={deleteError}
      />
    </div>
  );
}
