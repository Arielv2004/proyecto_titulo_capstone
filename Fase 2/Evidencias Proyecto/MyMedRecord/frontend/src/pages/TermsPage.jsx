import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { HeartHandshake, ArrowLeft, ShieldCheck, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

export const TermsPage = () => {
  const navigate = useNavigate();

  useMetaTags('Términos y Condiciones', 'Términos y Condiciones de uso de la plataforma clínica MyMedRecord.');

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800">
      <div className="h-1.5 w-full chile-banner" />

      <header className="border-b border-stone-200/80 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <span className="text-base font-bold text-blue-950 tracking-tight">MyMedRecord</span>
            <p className="text-[11px] text-stone-500 font-medium">Términos y Condiciones de Servicio</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-12">
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
              Condiciones de Uso del Servicio
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
              Términos y Condiciones de MyMedRecord
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Vigente para el Territorio Nacional de Chile · Ley N° 21.668
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-stone-600 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-900" />
                1. Objeto y Alcance de la Plataforma
              </h2>
              <p>
                MyMedRecord es un sistema informático de intermediación y unificación documental en salud diseñado para facilitar la interoperabilidad de antecedentes clínicos entre pacientes, profesionales de la salud y prestadores médicos reconocidos en Chile.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                2. Responsabilidad y Uso Asistencial de la IA
              </h2>
              <p>
                Los módulos de extracción óptica (OCR) e Inteligencia Artificial (LLM) funcionan como herramientas de apoyo al registro. La validación médica final de toda receta, posología y diagnóstico es de exclusiva responsabilidad del profesional médico tratante habilitado por la Superintendencia de Salud.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                3. Obligaciones del Usuario
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-stone-600 text-xs">
                <li>Proporcionar información veraz y coincidente con su identificación oficial (RUT).</li>
                <li>Mantener bajo debida custodia y confidencialidad sus credenciales de acceso.</li>
                <li>Hacer uso de los mecanismos de consentimiento (QR o autorización RUT) únicamente para fines asistenciales legítimos.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
