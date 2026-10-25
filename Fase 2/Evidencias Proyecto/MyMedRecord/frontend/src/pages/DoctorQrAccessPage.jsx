import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { formatRut, validateRut } from '../utils/rutValidator';
import { useMetaTags } from '../hooks/useMetaTags';
import api from '../services/api';
import { HeartHandshake, ShieldCheck, QrCode, Camera, Upload, AlertCircle, CheckCircle2, UserCheck, Info, ArrowLeft, RefreshCw, ChevronRight, Keyboard } from 'lucide-react';
import { ClinicalRecord } from '../components/doctor/ClinicalRecord';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { openDocumentBlob, prepareDocumentWindow } from '../services/documentsApi';

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
  const [activeScanTab, setActiveScanTab] = useState(tokenFromUrl ? 'MANUAL' : 'CAMERA'); // 'CAMERA' | 'UPLOAD' | 'MANUAL'
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [apiError, setApiError] = useState('');

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const isSecureEnv = typeof window !== 'undefined'
    && (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname))
    && Boolean(window.navigator.mediaDevices?.getUserMedia);

  // Datos desbloqueados de la Ficha
  const [clinicalData, setClinicalData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [fileError, setFileError] = useState('');
  const [openingFileId, setOpeningFileId] = useState(null);

  const handleOpenFile = async (documentId) => {
    const tab = prepareDocumentWindow();
    setFileError('');
    setOpeningFileId(documentId);
    try {
      const { data } = await api.post('/access-grants/qr/document-file', {
        token: doctorData.token, documentId, doctorRut: doctorData.rut, doctorName: doctorData.name,
      }, { responseType: 'blob' });
      openDocumentBlob(data, tab);
    } catch (error) {
      tab?.close();
      if ([403, 410].includes(error.response?.status)) {
        setClinicalData(null);
        setApiError('El código QR fue revocado o expiró.');
      } else setFileError('No fue posible abrir el documento original. Intenta nuevamente.');
    } finally { setOpeningFileId(null); }
  };

  useEffect(() => {
    if (!clinicalData || !doctorData.token) return undefined;
    let active = true;
    const check = async () => {
      try {
        const { data } = await api.post('/access-grants/qr/check', { token: doctorData.token });
        if (active) setTimeLeft(data.minutesRemaining);
      } catch (error) {
        if (active && [403, 410].includes(error.response?.status)) {
          setClinicalData(null);
          setApiError('El código QR fue revocado o expiró.');
        }
      }
    };
    const interval = window.setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', check); };
  }, [clinicalData, doctorData.token]);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraCaptureInputRef = useRef(null);
  const doctorDataRef = useRef(doctorData);

  useEffect(() => {
    doctorDataRef.current = doctorData;
  }, [doctorData]);

  const isRutValid = doctorData.rut.trim() !== '' && validateRut(doctorData.rut);

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setDoctorData({ ...doctorData, rut: formatted });
    setRutTouched(true);
  };

  async function startCamera() {
    setScannerError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
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
      setScannerError('No se pudo abrir la cámara en vivo. Puedes usar «Tomar foto del QR».');
      setIsScanning(false);
    }
  }

  async function stopCamera() {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // Silencioso
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  }

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

  // Manejar cuando un QR es detectado (cámara o foto)
  async function handleQrDecoded(text) {
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
  }

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
    } catch {
      // Continuar a redimensionamiento
    }

    // Intento 2: Redimensionar a 1200px (ideal para fotos nítidas de cámara móvil)
    try {
      const blob1200 = await resizeImageToBlob(file, 1200);
      const file1200 = new File([blob1200], 'qr_1200.jpg', { type: 'image/jpeg' });
      const res2 = await html5QrCode.scanFile(file1200, true);
      if (res2) return res2;
    } catch {
      // Continuar
    }

    // Intento 3: Redimensionar a 800px
    try {
      const blob800 = await resizeImageToBlob(file, 800);
      const file800 = new File([blob800], 'qr_800.jpg', { type: 'image/jpeg' });
      const res3 = await html5QrCode.scanFile(file800, true);
      if (res3) return res3;
    } catch {
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
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // cada 1 minuto
    return () => clearInterval(interval);
  }, [timeLeft]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas dark:bg-canvas text-body dark:text-ink transition-colors">

      {/* Header */}
      <header className="mm-qr-header border-b border-line/80 dark:border-line bg-surface/90 dark:bg-surface/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-action text-on-action shadow-xs group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <span className="mm-qr-header-brand text-base font-extrabold text-ink dark:text-ink tracking-tight flex items-center gap-1.5">
                MyMedRecord
                <span className="mm-qr-header-badge text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-accent-ink dark:text-teal-300 rounded border border-blue-200/60 dark:border-blue-800">
                  Acceso Médico
                </span>
              </span>
              <p className="mm-qr-header-subtitle text-xs text-muted dark:text-muted font-medium">
                Portal Médico Autorizado (Ley N° 21.668)
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted dark:text-body bg-surface-muted dark:bg-surface-muted px-3 py-1 rounded-full border border-line dark:border-line">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Acceso temporal registrado</span>
          </div>
          <ThemeToggle compact />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VISTA 1: IDENTIFICACIÓN Y ESCÁNER (ANTES DE DESBLOQUEAR LA FICHA)         */}
      {/* ========================================================================= */}
      {!clinicalData ? (
        <main id="main-content" tabIndex={-1} className="mm-shell mm-qr-shell">
          <div className="mm-qr-back mb-4">
            <Link to="/login" className="mm-qr-back-link" aria-label="Volver al inicio de sesión">
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Volver</span>
            </Link>
          </div>

          <div className="mm-qr-panel bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="mm-qr-intro text-center max-w-lg mx-auto">
              <div className="mm-qr-intro-icon w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-ink dark:text-ink tracking-tight">
                Portal de Acceso Médico
              </h1>
              <p className="text-sm text-muted dark:text-muted mt-1">
                Consulta una ficha médica solo cuando el paciente te haya dado acceso mediante un pase QR temporal.
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
              <div className="mm-qr-step p-5 bg-canvas dark:bg-surface-muted/60 rounded-2xl border border-line/80 dark:border-line space-y-3">
                <span className="mm-qr-step-title block text-xs font-bold uppercase tracking-wider text-ink dark:text-body flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  1. Identificación profesional
                </span>
                <p className="text-xs text-muted">Estos datos los declara quien usa el QR y quedan registrados en la actividad. El portal no comprueba su identidad profesional en este acceso.</p>

                <div className="mm-qr-fields grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-body dark:text-body mb-1">
                      RUT del Médico *
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorData.rut}
                      onChange={handleRutChange}
                      placeholder="Ej.: 12.345.678-5"
                      className={`w-full px-3.5 py-2.5 bg-surface dark:bg-surface border rounded-xl text-sm font-mono focus:outline-none transition-all ${rutTouched && doctorData.rut
                        ? isRutValid
                          ? 'border-emerald-500 text-body dark:text-ink focus:ring-2 focus:ring-emerald-100'
                          : 'border-rose-400 text-body dark:text-ink focus:ring-2 focus:ring-rose-100'
                        : 'border-line dark:border-line focus:border-blue-700 dark:focus:border-teal-400'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body dark:text-body mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorData.name}
                      onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
                      placeholder="Ej.: Dra. María González"
                      className="w-full px-3.5 py-2.5 bg-surface dark:bg-surface border border-line dark:border-line rounded-xl text-sm text-body dark:text-ink focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body dark:text-body mb-1">
                      Centro de Salud *
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorData.institution}
                      onChange={(e) => setDoctorData({ ...doctorData, institution: e.target.value })}
                      placeholder="Ej.: Hospital Regional"
                      className="w-full px-3.5 py-2.5 bg-surface dark:bg-surface border border-line dark:border-line rounded-xl text-sm text-body dark:text-ink focus:border-blue-700 dark:focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Paso 2: Escaneo del Código QR */}
              <div className="mm-qr-step p-5 bg-canvas dark:bg-surface-muted/60 rounded-2xl border border-line/80 dark:border-line space-y-4">
                <div className="mm-qr-method-head flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="mm-qr-step-title block text-xs font-bold uppercase tracking-wider text-ink dark:text-body flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    2. Código QR del paciente
                  </span>

                  {/* Selector de Métodos de Escaneo */}
                  <div className="mm-qr-method-tabs grid grid-cols-3 w-full min-w-0 p-1 bg-surface-muted/80 dark:bg-surface rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveScanTab('CAMERA')}
                      className={`mm-qr-method-tab min-w-0 px-1.5 py-1.5 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 text-center leading-tight cursor-pointer ${activeScanTab === 'CAMERA'
                        ? 'bg-surface dark:bg-surface-muted text-accent-ink dark:text-teal-300 shadow-xs'
                        : 'text-muted dark:text-muted'
                        }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Cámara</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveScanTab('UPLOAD')}
                      className={`mm-qr-method-tab min-w-0 px-1.5 py-1.5 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 text-center leading-tight cursor-pointer ${activeScanTab === 'UPLOAD'
                        ? 'bg-surface dark:bg-surface-muted text-accent-ink dark:text-teal-300 shadow-xs'
                        : 'text-muted dark:text-muted'
                        }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Imagen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveScanTab('MANUAL')}
                      className={`mm-qr-method-tab min-w-0 px-1.5 py-1.5 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 text-center leading-tight cursor-pointer ${activeScanTab === 'MANUAL'
                        ? 'bg-surface dark:bg-surface-muted text-accent-ink dark:text-teal-300 shadow-xs'
                        : 'text-muted dark:text-muted'
                        }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Manual</span>
                    </button>
                  </div>
                </div>

                {/* Elementos auxiliares ocultos para procesamiento */}
                <div id="qr-file-processor" className="hidden" />

                {/* Input para captura de foto con la cámara del dispositivo. */}
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
                    {/* La vista en vivo no está disponible en un contexto no seguro. */}
                    {!isSecureEnv && (
                      <div className="mm-qr-camera-note" role="status">
                        <Info aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold">Escanea con una foto</p>
                          <p className="leading-relaxed">
                            Usa «Tomar foto del QR» para leer el código. La vista en vivo requiere HTTPS.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Visor de video en vivo (solo activo si el navegador soporta getUserMedia) */}
                    {isSecureEnv && (
                      <div className="mm-qr-preview relative mx-auto w-full max-w-sm aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-teal-400/60 flex items-center justify-center">
                        <div id="qr-reader-container" className="w-full h-full" />
                        {!isScanning && !scannerError && (
                          <div className="absolute text-center p-4 text-stone-300 text-xs">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-teal-400" />
                            <span>Iniciando visor de cámara...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Captura mediante el selector de cámara del dispositivo. */}
                    <div className="space-y-2 max-w-sm mx-auto">
                      <button
                        type="button"
                        onClick={() => cameraCaptureInputRef.current?.click()}
                        disabled={isProcessingImage}
                        className="mm-qr-capture-button w-full py-3.5 px-4 bg-action hover:bg-action-hover active:scale-98 text-on-action font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingImage ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Leyendo Código QR...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 text-teal-200" />
                            <span>Tomar foto del QR</span>
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs text-muted dark:text-muted">
                        Abre la cámara del teléfono para leer el código.
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
                        <div className="w-10 h-10 rounded-xl bg-deep-brand text-white flex items-center justify-center shadow-xs">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="font-extrabold text-ink dark:text-ink text-xs block">
                          Tomar Foto con Cámara
                        </span>
                        <span className="text-xs text-muted dark:text-muted block leading-tight">
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
                        <div className="w-10 h-10 rounded-xl bg-action text-on-action flex items-center justify-center shadow-xs">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="font-extrabold text-ink dark:text-ink text-xs block">
                          Elegir de Galería o PC
                        </span>
                        <span className="text-xs text-muted dark:text-muted block leading-tight">
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
                    <label className="block text-xs font-bold text-body dark:text-body">
                      Código o Token de Acceso Médico
                    </label>
                    <input
                      type="text"
                      value={doctorData.token}
                      onChange={(e) => setDoctorData({ ...doctorData, token: e.target.value })}
                      placeholder="ej: MMR-12H-48E7C4A8B982DD05"
                      className="w-full px-3.5 py-2.5 bg-surface dark:bg-surface border border-line dark:border-line rounded-xl text-sm font-mono text-body dark:text-ink uppercase"
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
                className="mm-qr-submit w-full py-3.5 bg-action hover:bg-action-hover active:scale-[0.99] text-on-action font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                <span>{isValidating ? 'Validando vigencia y registrando auditoría...' : 'Validar y Consultar Ficha Clínica'}</span>
                <ChevronRight className="w-4 h-4 text-teal-300" />
              </button>
            </form>
          </div>
        </main>
      ) : <ClinicalRecord data={clinicalData} timeLeft={timeLeft} onFinish={() => { setClinicalData(null); setTimeLeft(null); }} onOpenFile={handleOpenFile} fileError={fileError} openingFileId={openingFileId} backLabel="Volver al acceso QR" />}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted dark:text-muted border-t border-line dark:border-line bg-surface dark:bg-surface transition-colors mt-auto">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable (Ley N° 21.668)
      </footer>
    </div>
  );
};
