import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { formatRut, validateRut } from '../utils/rutValidator';
import { useMetaTags } from '../hooks/useMetaTags';
import api from '../services/api';
import { 
  HeartHandshake, 
  ShieldCheck, 
  QrCode, 
  Camera, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Phone, 
  HeartPulse, 
  AlertTriangle, 
  Lock, 
  ArrowLeft,
  RefreshCw,
  Printer,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Keyboard
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const DoctorQrAccessPage = () => {
  useMetaTags('Portal de Acceso Médico por QR', 'Acceso profesional temporal y auditado a fichas clínicas de pacientes bajo Ley N° 21.668 en MyMedRecord.');

  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  // Formulario del Médico
  const [doctorData, setDoctorData] = useState({
    rut: '',
    name: '',
    institution: '',
    token: tokenFromUrl,
  });

  const [rutTouched, setRutTouched] = useState(false);
  const [activeScanTab, setActiveScanTab] = useState('CAMERA'); // 'CAMERA' | 'UPLOAD' | 'MANUAL'
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [apiError, setApiError] = useState('');

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSecureEnv, setIsSecureEnv] = useState(true);

  // Datos desbloqueados de la Ficha
  const [grantInfo, setGrantInfo] = useState(null);
  const [clinicalData, setClinicalData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraCaptureInputRef = useRef(null);
  const doctorDataRef = useRef(doctorData);

  useEffect(() => {
    doctorDataRef.current = doctorData;
  }, [doctorData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasGetUserMedia = Boolean(navigator?.mediaDevices?.getUserMedia);
      setIsSecureEnv((window.isSecureContext || isLocalhost) && hasGetUserMedia);
    }
  }, []);

  const isRutValid = doctorData.rut.trim() !== '' && validateRut(doctorData.rut);

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setDoctorData({ ...doctorData, rut: formatted });
    setRutTouched(true);
  };

  // Inicializar o detener escáner de cámara en vivo
  useEffect(() => {
    if (activeScanTab === 'CAMERA' && !clinicalData && isSecureEnv) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeScanTab, clinicalData, isSecureEnv]);

  const startCamera = async () => {
    setScannerError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      setScannerError('Los navegadores móviles requieren HTTPS para video en vivo. Usa el botón "Tomar Foto al QR" para escanear con la cámara del celular.');
      setIsScanning(false);
      return;
    }

    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const scanner = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(160, Math.floor(minEdge * 0.75));
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {
          // Errores menores de lectura en cuadros continuos se ignoran
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.warn('Error al iniciar cámara:', err);
      setScannerError('No se pudo activar el video en vivo de la cámara. Puedes tomar una foto directamente con la cámara de tu celular pulsando el botón a continuación.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        // Silencioso
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  // Manejar cuando un QR es detectado (cámara o foto)
  const handleQrDecoded = async (text) => {
    let token = text.trim();
    if (token.includes('token=')) {
      const match = token.match(/token=([A-Za-z0-9-]+)/);
      if (match && match[1]) token = match[1];
    }

    setDoctorData((prev) => ({ ...prev, token }));
    await stopCamera();

    const currentDoc = doctorDataRef.current;
    if (validateRut(currentDoc.rut) && currentDoc.name.trim()) {
      executeValidation(token, currentDoc.rut, currentDoc.name, currentDoc.institution);
    }
  };

  // Redimensionar imagen para escaneo óptimo de códigos QR (evita fallos de memoria con fotos de 12-48MP de celulares)
  const resizeImageToBlob = (file, maxDim = 1200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Error al procesar la imagen'));
            },
            'image/jpeg',
            0.92
          );
        };
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  // Decodificar QR con múltiples intentos adaptativos
  const scanImageFileWithFallbacks = async (file) => {
    const html5QrCode = new Html5Qrcode('qr-file-processor');

    // Intento 1: Escaneo directo
    try {
      const res1 = await html5QrCode.scanFile(file, true);
      if (res1) return res1;
    } catch (err1) {
      // Continuar a redimensionamiento
    }

    // Intento 2: Redimensionar a 1200px (ideal para fotos nítidas de cámara móvil)
    try {
      const blob1200 = await resizeImageToBlob(file, 1200);
      const file1200 = new File([blob1200], 'qr_1200.jpg', { type: 'image/jpeg' });
      const res2 = await html5QrCode.scanFile(file1200, true);
      if (res2) return res2;
    } catch (err2) {
      // Continuar
    }

    // Intento 3: Redimensionar a 800px
    try {
      const blob800 = await resizeImageToBlob(file, 800);
      const file800 = new File([blob800], 'qr_800.jpg', { type: 'image/jpeg' });
      const res3 = await html5QrCode.scanFile(file800, true);
      if (res3) return res3;
    } catch (err3) {
      // Continuar
    }

    throw new Error('No se detectó ningún Código QR legible en la foto. Asegúrate de enfocar de cerca el código e intenta nuevamente.');
  };

  // Escaneo mediante subida de imagen o foto capturada
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerError('');
    setIsProcessingImage(true);

    try {
      const decodedText = await scanImageFileWithFallbacks(file);
      await handleQrDecoded(decodedText);
    } catch (err) {
      setScannerError(err.message || 'No se detectó ningún Código QR nítido en la foto seleccionada.');
    } finally {
      setIsProcessingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Enviar validación a la API
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!validateRut(doctorData.rut)) {
      setApiError('Por favor ingresa un RUT chileno profesional válido (Módulo 11).');
      return;
    }
    if (!doctorData.token.trim()) {
      setApiError('Por favor escanea o ingresa el código del token QR.');
      return;
    }

    executeValidation(doctorData.token, doctorData.rut, doctorData.name, doctorData.institution);
  };

  const executeValidation = async (token, doctorRut, doctorName, doctorInstitution) => {
    setIsValidating(true);
    setApiError('');

    try {
      const res = await api.post('/access-grants/validate', {
        token: token.trim(),
        doctorRut: doctorRut.trim(),
        doctorName: doctorName.trim(),
        doctorInstitution: doctorInstitution.trim(),
      });

      if (res.data.success) {
        setGrantInfo(res.data.data.grant);
        setClinicalData(res.data.data.clinicalData);
        setTimeLeft(res.data.data.grant.minutesRemaining);
        await stopCamera();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al validar el Código QR o el acceso ha expirado.';
      setApiError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  // Cuenta regresiva visual de minutos restantes
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          alert('El tiempo de vigencia de este Código QR ha expirado. Por seguridad la ficha clínica se ha bloqueado.');
          setClinicalData(null);
          setGrantInfo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // cada 1 minuto
    return () => clearInterval(interval);
  }, [timeLeft]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Franja Institucional Bicolor */}
      <div className="h-1.5 w-full chile-banner" />

      {/* Header */}
      <header className="border-b border-stone-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <span className="text-base font-extrabold text-blue-950 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                MyMedRecord
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-teal-300 rounded border border-blue-200/60 dark:border-blue-800">
                  Acceso Médico
                </span>
              </span>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                Portal Médico Autorizado (Ley N° 21.668)
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-stone-200 dark:border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Trazabilidad Legal Activa</span>
          </div>
          <ThemeToggle compact />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VISTA 1: IDENTIFICACIÓN Y ESCÁNER (ANTES DE DESBLOQUEAR LA FICHA)         */}
      {/* ========================================================================= */}
      {!clinicalData ? (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center my-4">
          <div className="mb-4">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-teal-300 hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Inicio de Sesión</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-blue-950 dark:text-slate-100 tracking-tight">
                Portal de Acceso Médico
              </h1>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                Consulta clínica autorizada por el paciente. Válido para centros de salud, hospitales, clínicas, CESFAM y consultas privadas bajo <strong>Ley N° 21.668</strong>.
              </p>
            </div>

            {apiError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Paso 1: Datos Profesionales del Médico */}
              <div className="p-5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-800 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  1. Identificación del Profesional de Salud
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                      RUT del Médico *
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorData.rut}
                      onChange={handleRutChange}
                      placeholder="9.876.543-2"
                      className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm font-mono focus:outline-none transition-all ${
                        rutTouched && doctorData.rut
                          ? isRutValid
                            ? 'border-emerald-500 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-100'
                            : 'border-rose-400 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-100'
                          : 'border-stone-300 dark:border-slate-700 focus:border-blue-700 dark:focus:border-teal-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorData.name}
                      onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
                      placeholder="Dr. Ariel Velásquez"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                      Centro de Salud / Clínica / Consulta *
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorData.institution}
                      onChange={(e) => setDoctorData({ ...doctorData, institution: e.target.value })}
                      placeholder="Ej: Hospital Puerto Montt, Clínica Alemana, CESFAM o Consulta Privada"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Paso 2: Escaneo del Código QR */}
              <div className="p-5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    2. Escanear o Cargar Código QR del Paciente
                  </span>

                  {/* Selector de Métodos de Escaneo */}
                  <div className="flex p-1 bg-stone-200/80 dark:bg-slate-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveScanTab('CAMERA')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        activeScanTab === 'CAMERA'
                          ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-teal-300 shadow-xs'
                          : 'text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Cámara</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveScanTab('UPLOAD')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        activeScanTab === 'UPLOAD'
                          ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-teal-300 shadow-xs'
                          : 'text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveScanTab('MANUAL')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        activeScanTab === 'MANUAL'
                          ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-teal-300 shadow-xs'
                          : 'text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Manual</span>
                    </button>
                  </div>
                </div>

                {/* Elementos auxiliares ocultos para procesamiento */}
                <div id="qr-file-processor" className="hidden" />

                {/* Input para captura de foto directa con la cámara del celular (soporta iOS y Android sobre HTTP y HTTPS) */}
                <input 
                  type="file" 
                  ref={cameraCaptureInputRef} 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />

                {/* Input estándar para selección de archivos (Galería de fotos o PC) */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />

                {/* Contenido según pestaña de escáner */}
                {activeScanTab === 'CAMERA' && (
                  <div className="space-y-4">
                    {/* Alerta si el dispositivo accede por HTTP en red local */}
                    {!isSecureEnv && (
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold">Acceso Móvil en Red Local (HTTP)</p>
                          <p className="text-[11px] text-stone-600 dark:text-slate-300 leading-relaxed">
                            Los navegadores móviles (Chrome/Safari) bloquean el streaming continuo de video en conexiones HTTP por seguridad. Usa el botón verde a continuación para abrir la cámara de tu celular, tomar la foto al código QR y escanearlo al instante.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Visor de video en vivo (solo activo si el navegador soporta getUserMedia) */}
                    {isSecureEnv && (
                      <div className="relative mx-auto w-full max-w-sm aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-teal-400/60 flex items-center justify-center">
                        <div id="qr-reader-container" className="w-full h-full" />
                        {!isScanning && !scannerError && (
                          <div className="absolute text-center p-4 text-stone-300 text-xs">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-teal-400" />
                            <span>Iniciando visor de cámara...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botón de captura rápida con la cámara del celular (100% compatible con todos los celulares) */}
                    <div className="space-y-2 max-w-sm mx-auto">
                      <button
                        type="button"
                        onClick={() => cameraCaptureInputRef.current?.click()}
                        disabled={isProcessingImage}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingImage ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Leyendo Código QR...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 text-teal-200" />
                            <span>Tomar Foto al QR con la Cámara</span>
                          </>
                        )}
                      </button>

                      <p className="text-center text-[11px] text-stone-500 dark:text-slate-400">
                        Abre la cámara de tu teléfono para capturar y leer el código directamente.
                      </p>
                    </div>

                    {scannerError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-center text-xs text-rose-700 dark:text-rose-300 font-semibold">
                        {scannerError}
                      </div>
                    )}
                  </div>
                )}

                {activeScanTab === 'UPLOAD' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opción 1: Tomar Foto con la Cámara */}
                      <button
                        type="button"
                        onClick={() => cameraCaptureInputRef.current?.click()}
                        disabled={isProcessingImage}
                        className="p-5 border-2 border-dashed border-teal-400/80 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
                      >
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="font-extrabold text-blue-950 dark:text-slate-100 text-xs block">
                          Tomar Foto con Cámara
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 block leading-tight">
                          Abre la cámara de tu celular
                        </span>
                      </button>

                      {/* Opción 2: Subir de Galería o PC */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingImage}
                        className="p-5 border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="font-extrabold text-blue-950 dark:text-slate-100 text-xs block">
                          Elegir de Galería o PC
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 block leading-tight">
                          Pase descargado, fotos o capturas
                        </span>
                      </button>
                    </div>

                    {isProcessingImage && (
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-center gap-2 text-xs text-teal-800 dark:text-teal-200 font-bold animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analizando imagen y decodificando código QR...</span>
                      </div>
                    )}

                    {scannerError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-center text-xs text-rose-700 dark:text-rose-300 font-semibold">
                        {scannerError}
                      </div>
                    )}
                  </div>
                )}

                {activeScanTab === 'MANUAL' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                      Código o Token de Acceso Médico
                    </label>
                    <input
                      type="text"
                      value={doctorData.token}
                      onChange={(e) => setDoctorData({ ...doctorData, token: e.target.value })}
                      placeholder="ej: MMR-12H-48E7C4A8B982DD05"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 uppercase"
                    />
                  </div>
                )}

                {/* Token detectado */}
                {doctorData.token && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Código detectado: <strong className="font-mono">{doctorData.token}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDoctorData({ ...doctorData, token: '' })}
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de Desbloqueo */}
              <button
                type="submit"
                disabled={isValidating || !doctorData.token}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                <span>{isValidating ? 'Validando vigencia y registrando auditoría...' : 'Validar y Consultar Ficha Clínica'}</span>
                <ChevronRight className="w-4 h-4 text-teal-300" />
              </button>
            </form>
          </div>
        </main>
      ) : (
        /* ========================================================================= */
        /* VISTA 2: VISOR CLÍNICO PROFESIONAL (DATOS DESBLOQUEADOS)                   */
        /* ========================================================================= */
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 my-4 animate-in fade-in duration-200">
          {/* Cintillo de Seguridad y Cuenta Regresiva */}
          <div className="p-4 bg-teal-900 text-white rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-teal-300 animate-pulse" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-teal-200 block">
                  Acceso Clínico Temporal Autorizado
                </span>
                <span className="text-sm font-bold block">
                  Vigente por {timeLeft > 60 ? `${Math.floor(timeLeft / 60)}h ${timeLeft % 60}m` : `${timeLeft} minutos restantes`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ficha Clínica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setClinicalData(null);
                  setGrantInfo(null);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Finalizar Consulta
              </button>
            </div>
          </div>

          {/* Ficha Resumen del Paciente */}
          <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/80 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-teal-300 font-black text-xl flex items-center justify-center">
                  {clinicalData.patient.firstName[0]}{clinicalData.patient.lastName[0]}
                </div>
                <div>
                  <h2 className="text-xl font-black text-blue-950 dark:text-slate-100">
                    {clinicalData.patient.firstName} {clinicalData.patient.lastName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-slate-400 mt-1">
                    <span className="font-mono font-bold text-blue-900 dark:text-teal-300">
                      RUT: {clinicalData.patient.rut}
                    </span>
                    <span>•</span>
                    <span>Previsión: {clinicalData.profile.healthInsurance || 'FONASA'}</span>
                    <span>•</span>
                    <span>Donante: {clinicalData.profile.isOrganDonor ? 'Sí (Ley 20.413)' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-1.5">
                  Grupo: {clinicalData.profile.bloodType || 'Sin Registrar'}
                </span>
              </div>
            </div>

            {/* Alertas Críticas (Alergias y Condiciones) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Alergias Conocidas (Crítico)
                </span>
                {clinicalData.profile.allergies && clinicalData.profile.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {clinicalData.profile.allergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-slate-400">Sin alergias declaradas.</p>
                )}
              </div>

              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Enfermedades Crónicas / Diagnósticos Base
                </span>
                {clinicalData.profile.chronicConditions && clinicalData.profile.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {clinicalData.profile.chronicConditions.map((condition, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-bold"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-slate-400">Sin patologías crónicas reportadas.</p>
                )}
              </div>
            </div>

            {/* Recetas y Tratamientos Activos */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-blue-950 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Tratamientos y Recetas Médicas Activas ({clinicalData.prescriptions?.length || 0})</span>
              </h3>

              {clinicalData.prescriptions && clinicalData.prescriptions.length > 0 ? (
                <div className="space-y-3">
                  {clinicalData.prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="p-4 bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-800 rounded-2xl space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-700/80 pb-2">
                        <div>
                          <span className="text-xs font-bold text-blue-950 dark:text-slate-100 block">
                            {rx.diagnosis_text} {rx.diagnosis_code ? `(${rx.diagnosis_code})` : ''}
                          </span>
                          <span className="text-[11px] text-stone-400 dark:text-slate-500">
                            Emisor: {rx.doctor_name || 'Médico Tratante'} · Fecha: {rx.issue_date || 'Reciente'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[11px] font-bold self-start">
                          Vigente hasta {rx.valid_until || 'Próximo control'}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {rx.items?.map((item, i) => (
                          <div key={i} className="text-xs flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <div>
                              <strong className="text-slate-800 dark:text-slate-200">{item.medication_name}</strong> - {item.dosage} ({item.frequency})
                              {item.instructions && (
                                <p className="text-[11px] text-stone-500 dark:text-slate-400 italic mt-0.5">Indicación: {item.instructions}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-stone-50 dark:bg-slate-800/40 rounded-2xl text-center text-xs text-stone-400">
                  No hay recetas activas registradas en la ficha digital.
                </div>
              )}
            </div>

            {/* Contacto de Emergencia */}
            {clinicalData.profile.emergencyContactName && (
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-teal-300" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-blue-900 dark:text-teal-300 block">
                      Contacto de Emergencia Oficial
                    </span>
                    <span className="text-sm font-bold text-blue-950 dark:text-slate-100 block">
                      {clinicalData.profile.emergencyContactName}
                    </span>
                  </div>
                </div>

                {clinicalData.profile.emergencyContactPhone && (
                  <a
                    href={`tel:${clinicalData.profile.emergencyContactPhone}`}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-300" />
                    <span>Llamar: {clinicalData.profile.emergencyContactPhone}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-stone-400 dark:text-slate-500 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors mt-auto">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable (Ley N° 21.668)
      </footer>
    </div>
  );
};
