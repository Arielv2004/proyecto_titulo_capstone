import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { HeartHandshake, ArrowLeft, ShieldCheck, Lock, Eye, FileText, UserCheck } from 'lucide-react';

export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  useMetaTags('Política de Privacidad', 'Política de Privacidad y Protección de Datos de Salud de MyMedRecord según la legislación chilena.');

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
            <p className="text-[11px] text-stone-500 font-medium">Política de Privacidad y Tratamiento de Datos</p>
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
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
              Marco Regulatorio de la República de Chile
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
              Política de Privacidad y Confidencialidad Médica
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Última actualización: Agosto 2026 · Cumplimiento de Leyes N° 19.628, N° 20.584 y N° 21.668.
            </p>
          </div>

          <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-950 leading-relaxed">
              <strong>Compromiso de Soberanía del Paciente:</strong> En MyMedRecord, tú eres el único dueño de tu información de salud. Ninguna entidad ni médico puede visualizar tu historial sin tu autorización explícita (vía QR o verificación por RUT).
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-stone-600 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-900" />
                1. Datos Personales y Sensibles Recolectados
              </h2>
              <p>
                MyMedRecord recopila exclusivamente la información requerida para la prestación y continuidad del servicio de salud:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600 text-xs">
                <li><strong>Identificación Oficial:</strong> Nombre completo, Rol Único Tributario (RUT) y correo electrónico.</li>
                <li><strong>Información Médica Sensible:</strong> Recetas médicas, diagnósticos, resultados de exámenes de laboratorio y registros de signos vitales.</li>
                <li><strong>Registros Técnicos de Auditoría:</strong> Dirección IP, fecha, hora e identificación del usuario que realiza cada acción en la plataforma.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-900" />
                2. Medidas de Seguridad y Cifrado (AES-256-GCM)
              </h2>
              <p>
                En conformidad con los estándares de ciberseguridad sanitaria, todos los datos médicos sensibles son almacenados encriptados en reposo mediante el algoritmo criptográfico militar <strong>AES-256-GCM</strong>. Las credenciales de acceso se protegen con funciones hash unidireccionales (Bcrypt) y las sesiones se gestionan mediante cookies <strong>HttpOnly</strong> y <strong>SameSite=Strict</strong>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-900" />
                3. Derechos del Titular de Datos (ARCO)
              </h2>
              <p>
                Bajo la <strong>Ley N° 19.628</strong> y la <strong>Ley N° 20.584</strong>, como titular de los datos tienes derecho a:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600 text-xs">
                <li><strong>Acceso:</strong> Conocer en todo momento qué datos clínicos están registrados a tu nombre.</li>
                <li><strong>Rectificación:</strong> Solicitar la actualización de datos erróneos o desactualizados.</li>
                <li><strong>Cancelación y Revocación:</strong> Revocar en cualquier momento los permisos temporales otorgados a profesionales médicos.</li>
                <li><strong>Trazabilidad:</strong> Revisar la bitácora inmutable de quién y cuándo ha consultado tu información de salud.</li>
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
