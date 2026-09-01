import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cookie, X, Check } from 'lucide-react';

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasConsent = localStorage.getItem('mymedrecord_cookie_consent');
    if (!hasConsent) {
      // Mostrar con un leve retraso para suavidad visual
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('mymedrecord_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('mymedrecord_cookie_consent', 'essential_only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside aria-label="Consentimiento de cookies y privacidad" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-400/30">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">Privacidad y Cookies de Seguridad</h2>
              <span className="text-[10px] text-teal-300 font-medium">Ley N° 21.668 & N° 19.628</span>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-stone-300 leading-relaxed">
          Utilizamos cookies esenciales y seguras (<strong>HttpOnly y SameSite=Strict</strong>) para autenticar tu sesión médica y proteger tu ficha clínica contra accesos no autorizados. No utilizamos cookies de rastreo publicitario.
        </p>

        <div className="pt-1 flex items-center justify-between gap-2">
          <Link
            to="/privacy"
            className="text-[10px] text-teal-300 hover:underline font-bold"
          >
            Ver Política de Privacidad
          </Link>

          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-stone-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
            >
              Solo Esenciales
            </button>
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-blue-950 text-[11px] font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aceptar</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
