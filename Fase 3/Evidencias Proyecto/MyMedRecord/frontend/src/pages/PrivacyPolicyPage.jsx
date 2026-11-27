import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { HeartHandshake, ArrowLeft, ShieldCheck, Lock, FileText, UserCheck, HeartPulse } from 'lucide-react';

export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  useMetaTags('Política de Privacidad', 'Política de Privacidad y Protección de Datos de Salud de MyMedRecord según la legislación chilena.');

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-body">

      <header className="border-b border-line/80 bg-surface px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-action text-on-action shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <span className="text-base font-bold text-ink tracking-tight">MyMedRecord</span>
            <p className="text-xs text-muted font-medium">Política de Privacidad y Tratamiento de Datos</p>
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
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
              Marco Regulatorio de la República de Chile
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Política de Privacidad y Confidencialidad Médica
            </h1>
            <p className="text-xs text-muted mt-1">
              Información sobre los datos y accesos del prototipo MyMedRecord.
            </p>
          </div>

          <div className="p-4 bg-accent-soft border border-line rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-accent-ink shrink-0 mt-0.5" />
            <div className="text-sm text-body leading-relaxed">
              <strong>Control de acceso del paciente:</strong> Puedes compartir temporalmente tu ficha mediante un QR o un permiso directo a un médico registrado, y revocar esos permisos desde tu portal. Quien tenga un QR vigente puede usarlo sin cuenta.
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-muted leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-ink" />
                1. Datos Personales y Sensibles Recolectados
              </h2>
              <p>
                MyMedRecord recopila exclusivamente la información requerida para la prestación y continuidad del servicio de salud:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li><strong>Identificación Oficial:</strong> Nombre completo, Rol Único Tributario (RUT) y correo electrónico.</li>
                <li><strong>Información Médica Sensible:</strong> Documentos, recetas, diagnósticos, resultados de laboratorio y antecedentes declarados en el perfil.</li>
                <li><strong>Registros Técnicos de Auditoría:</strong> Dirección IP, fecha, hora e identificación del usuario que realiza cada acción en la plataforma.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent-ink" />
                2. Medidas de seguridad del acceso
              </h2>
              <p>
                Las contraseñas se almacenan como hashes mediante Bcrypt. La sesión usa una cookie <strong>HttpOnly</strong> y <strong>SameSite=Strict</strong>. Los permisos temporales permiten al paciente compartir su ficha y revocar el acceso. En el acceso por QR sin cuenta, los datos del profesional son declarados por quien ingresa el código; su identidad no se verifica automáticamente.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-accent-ink" />
                3. Derechos del Titular de Datos (ARCOP)
              </h2>
              <p>
                Bajo la <strong>Ley N° 19.628</strong>, la <strong>Ley N° 21.719</strong> y la <strong>Ley N° 20.584</strong>, como titular de los datos tienes derecho a:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li><strong>Acceso:</strong> Conocer en todo momento qué datos clínicos están registrados a tu nombre.</li>
                <li><strong>Rectificación:</strong> Solicitar la actualización de datos erróneos o desactualizados.</li>
                <li><strong>Cancelación y Revocación:</strong> Revocar en cualquier momento los permisos temporales otorgados a profesionales médicos.</li>
                <li><strong>Actividad:</strong> Revisar los registros de accesos y acciones disponibles en tu portal.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-accent-ink" />
                4. Tratamiento de Datos Sensibles (Ley 21.719)
              </h2>
              <p>
                Los datos relativos a tu salud son <strong>datos personales sensibles</strong>. Su tratamiento en MyMedRecord se basa exclusivamente en tu <strong>consentimiento explícito, libre, informado y específico</strong>, otorgado al momento de registrarte. Registramos la fecha, hora y versión de esta política que aceptaste.
              </p>

              <h3 className="text-sm font-bold text-ink pt-1">4.1 Qué datos sensibles recopilamos</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li><strong>Imágenes de documentos clínicos:</strong> fotografías o archivos de recetas médicas, órdenes y resultados de exámenes que subas a la plataforma.</li>
                <li><strong>Información clínica extraída:</strong> diagnósticos, medicamentos, posología y resultados de laboratorio.</li>
                <li><strong>Antecedentes de salud:</strong> alergias, enfermedades crónicas y otros datos que declares en tu perfil.</li>
              </ul>

              <h3 className="text-sm font-bold text-ink pt-1">4.2 Con qué finalidad</h3>
              <p>
                Usamos estos datos únicamente para la <strong>gestión de tu ficha clínica personal</strong>: organizar tu historial, mostrar tus tratamientos activos y permitirte compartirlo temporalmente con los profesionales de salud que tú autorices. No los usamos con fines comerciales ni publicitarios, y no los cedemos a terceros para esos fines.
              </p>

              <h3 className="text-sm font-bold text-ink pt-1">4.3 Proveedores externos (encargados de tratamiento)</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li><strong>Google Gemini (Inteligencia Artificial):</strong> procesa las imágenes de tus documentos para extraer y estructurar automáticamente su contenido (texto, medicamentos, diagnósticos).</li>
                <li><strong>Supabase (almacenamiento):</strong> almacena de forma segura los archivos de los documentos que subes.</li>
              </ul>
              <p className="text-xs">
                Estos proveedores actúan por cuenta de MyMedRecord y pueden procesar la información en servidores ubicados fuera de Chile (transferencia internacional de datos), bajo sus propias medidas de seguridad y confidencialidad.
              </p>

              <h3 className="text-sm font-bold text-ink pt-1">4.4 Cómo ejercer tus derechos ARCOP</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted text-xs">
                <li><strong>Acceso:</strong> consultar tus datos y documentos desde tu portal de paciente.</li>
                <li><strong>Rectificación:</strong> editar los datos extraídos de tus documentos y tu perfil, o pedir su corrección.</li>
                <li><strong>Cancelación / Supresión:</strong> eliminar documentos o solicitar la eliminación de tu cuenta y sus datos.</li>
                <li><strong>Oposición:</strong> oponerte a un tratamiento específico, como el procesamiento automatizado por IA.</li>
                <li><strong>Portabilidad:</strong> solicitar una copia de tus datos en un formato estructurado y de uso común.</li>
              </ul>
              <p>
                Puedes <strong>revocar tu consentimiento</strong> en cualquier momento, sin efecto retroactivo. Para ejercer cualquiera de estos derechos escribe a{' '}
                <a href="mailto:privacidad@mymedrecord.cl" className="font-bold text-accent-ink hover:underline">
                  privacidad@mymedrecord.cl
                </a>
                {' '}indicando tu RUT y el derecho que deseas ejercer.
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
