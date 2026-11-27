import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { HeartHandshake, ArrowLeft, Scale, CheckCircle2, AlertTriangle, HeartPulse } from 'lucide-react';

export const TermsPage = () => {
  const navigate = useNavigate();

  useMetaTags('Términos y Condiciones', 'Términos y Condiciones de uso de la plataforma clínica MyMedRecord.');

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-body">

      <header className="border-b border-line/80 bg-surface px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-action text-on-action shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <span className="text-base font-bold text-ink tracking-tight">MyMedRecord</span>
            <p className="text-xs text-muted font-medium">Términos y Condiciones de Servicio</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-surface-muted rounded-xl text-xs font-bold text-body transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-12">
        <div className="bg-surface border border-line/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold text-accent-ink uppercase tracking-wider block mb-1">
              Condiciones de Uso del Servicio
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Términos y Condiciones de MyMedRecord
            </h1>
            <p className="text-xs text-muted mt-1">
              Vigente para el Territorio Nacional de Chile · Ley N° 21.668
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-muted leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Scale className="w-4 h-4 text-accent-ink" />
                1. Objeto y Alcance de la Plataforma
              </h2>
              <p>
                MyMedRecord es un sistema informático de intermediación y unificación documental en salud diseñado para facilitar la interoperabilidad de antecedentes clínicos entre pacientes, profesionales de la salud y prestadores médicos reconocidos en Chile.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                2. Responsabilidad y Uso Asistencial de la IA
              </h2>
              <p>
                Los módulos de extracción óptica (OCR) e Inteligencia Artificial (LLM) funcionan como herramientas de apoyo al registro. La validación médica final de toda receta, posología y diagnóstico es de exclusiva responsabilidad del profesional médico tratante habilitado por la Superintendencia de Salud.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                3. Obligaciones del Usuario
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li>Proporcionar información veraz y coincidente con su identificación oficial (RUT).</li>
                <li>Mantener bajo debida custodia y confidencialidad sus credenciales de acceso.</li>
                <li>Hacer uso de los mecanismos de consentimiento (QR o autorización RUT) únicamente para fines asistenciales legítimos.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-accent-ink" />
                4. Tratamiento de Datos Sensibles (Ley 21.719)
              </h2>
              <p>
                Al registrarte otorgas tu <strong>consentimiento explícito</strong> para el tratamiento de tus datos personales sensibles de salud. MyMedRecord registra la fecha, hora y versión de los términos aceptados.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li><strong>Datos recopilados:</strong> imágenes de recetas, órdenes y exámenes; diagnósticos, medicamentos y resultados de laboratorio.</li>
                <li><strong>Finalidad:</strong> exclusivamente la gestión de tu ficha clínica personal y su acceso por profesionales que tú autorices.</li>
                <li><strong>Proveedores externos:</strong> <strong>Google Gemini</strong> (IA para extraer el contenido de tus documentos) y <strong>Supabase</strong> (almacenamiento de archivos). Pueden procesar datos fuera de Chile.</li>
                <li><strong>Derechos ARCOP:</strong> Acceso, Rectificación, Cancelación, Oposición y Portabilidad, además de la revocación del consentimiento, escribiendo a{' '}
                  <a href="mailto:privacidad@mymedrecord.cl" className="font-bold text-accent-ink hover:underline">privacidad@mymedrecord.cl</a>.
                </li>
              </ul>
              <p className="text-xs">
                El detalle completo está disponible en la{' '}
                <Link to="/privacy" className="font-bold text-accent-ink hover:underline">
                  Política de Privacidad
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted border-t border-line bg-surface">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
