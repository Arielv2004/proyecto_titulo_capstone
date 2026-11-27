import React, { useState } from 'react';
import { ChevronDown, PhoneCall, ShieldCheck } from 'lucide-react';

const questions = [
  {
    question: '¿Qué documentos puedo subir?',
    answer: 'Puedes subir imágenes o archivos PDF de recetas, exámenes e informes. Si el sistema extrae datos del documento, compáralos con el original antes de guardarlos.',
  },
  {
    question: '¿Cómo comparto mi ficha con un médico?',
    answer: 'En Inicio puedes elegir un médico o usar Mostrar QR. Al crear el acceso eliges su duración; en Accesos puedes revisar su vigencia y revocarlo.',
  },
  {
    question: '¿Qué significa «Documento guardado»?',
    answer: 'Significa que el documento quedó en Mi ficha. No acredita que un profesional haya revisado el contenido ni que los datos extraídos sean clínicamente correctos.',
  },
  {
    question: '¿Dónde reviso los accesos a mi ficha?',
    answer: 'Abre Accesos para consultar los permisos emitidos, su estado y la actividad registrada. Desde allí puedes revocar un permiso vigente.',
  },
  {
    question: '¿Dónde consulto información legal?',
    answer: 'En el menú Mi cuenta encontrarás Marco Legal, la Política de Privacidad y los Términos de Uso.',
  },
];

export function PatientHelp() {
  const [openQuestion, setOpenQuestion] = useState(null);

  return (
    <div className="mm-help mm-stack">
      <header className="mm-help-header">
        <p className="mm-eyebrow">AYUDA</p>
        <h1>Resuelve tus dudas</h1>
        <p className="mm-description">Guías breves para guardar y compartir tu información de salud.</p>
      </header>

      <section className="mm-help-contacts" aria-label="Contactos de salud en Chile">
        <div className="mm-help-contact mm-help-contact--urgent">
          <span className="mm-help-contact-icon" aria-hidden="true">131</span>
          <div><strong>SAMU Urgencias</strong><span>Ambulancias y riesgo vital</span></div>
        </div>
        <div className="mm-help-contact mm-help-contact--phone">
          <span className="mm-help-contact-icon"><PhoneCall size={20} aria-hidden="true" /></span>
          <div><strong>Salud Responde</strong><span>600 360 77 77 (Minsal)</span></div>
        </div>
        <div className="mm-help-contact mm-help-contact--rights">
          <span className="mm-help-contact-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
          <div><strong>Superintendencia de Salud</strong><span>Derechos en salud</span></div>
        </div>
      </section>

      <section className="mm-card mm-help-faq" aria-labelledby="patient-help-faq-title">
        <h2 id="patient-help-faq-title">Preguntas frecuentes</h2>
        <div className="mm-help-faq-list">
          {questions.map(({ question, answer }, index) => {
            const open = openQuestion === index;
            const answerId = `patient-help-answer-${index}`;
            return (
              <div className="mm-help-faq-item" key={question}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={answerId}
                    onClick={() => setOpenQuestion(open ? null : index)}
                  >
                    <span>{question}</span>
                    <ChevronDown className={open ? 'mm-info-chevron mm-info-chevron--open' : 'mm-info-chevron'} size={18} aria-hidden="true" />
                  </button>
                </h3>
                <div id={answerId} className="mm-help-faq-answer" hidden={!open}>
                  <p>{answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
