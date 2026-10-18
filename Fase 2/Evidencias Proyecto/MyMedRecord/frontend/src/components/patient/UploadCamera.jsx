import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, RefreshCw } from 'lucide-react';
import { Button } from '../ui/ClinicalUI';

export function UploadCamera({ onCapture, onBack }) {
  const videoRef = useRef(null);
  const nativeInputRef = useRef(null);
  const [cameraError, setCameraError] = useState(() =>
    typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
      ? ''
      : 'Este navegador no permite abrir la cámara aquí. Usa la cámara del dispositivo.'
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let stream;
    const video = videoRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      return undefined;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        if (video) {
          video.srcObject = mediaStream;
          video.play().then(() => {
            if (mounted) setReady(true);
          }).catch(() => {
            mediaStream.getTracks().forEach((track) => track.stop());
            if (mounted) setCameraError('No pudimos mostrar la cámara. Prueba con la cámara del dispositivo.');
          });
        }
      })
      .catch(() => {
        if (mounted) setCameraError('No pudimos acceder a la cámara. Revisa el permiso o usa la cámara del dispositivo.');
      });

    return () => {
      mounted = false;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('No pudimos capturar la foto. Intenta nuevamente.');
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('No pudimos capturar la foto. Intenta nuevamente.');
        return;
      }
      onCapture(new File([blob], `documento-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  const handleNativeCapture = (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) onCapture(file);
  };

  return (
    <div className="mm-upload-camera">
      <button type="button" className="mm-upload-back" onClick={onBack} autoFocus>
        <ArrowLeft size={17} aria-hidden="true" /> Volver a las opciones
      </button>
      <div className={`mm-upload-camera-preview${cameraError ? ' mm-upload-camera-preview--unavailable' : ''}`}>
        <video ref={videoRef} autoPlay muted playsInline aria-label="Vista previa de la cámara" />
        {!ready && !cameraError && <span>Abriendo cámara…</span>}
        {cameraError && <span>Cámara no disponible</span>}
      </div>
      {cameraError && <p className="mm-upload-camera-error" role="alert">{cameraError}</p>}
      <div className="mm-upload-camera-actions">
        <Button onClick={takePhoto} disabled={!ready}>
          <Camera size={18} aria-hidden="true" /> Tomar foto
        </Button>
        {cameraError && (
          <Button variant="secondary" onClick={() => nativeInputRef.current?.click()}>
            <RefreshCw size={17} aria-hidden="true" /> Abrir cámara del dispositivo
          </Button>
        )}
      </div>
      <input ref={nativeInputRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} onChange={handleNativeCapture} />
      <p className="mm-upload-camera-hint">Enfoca todo el documento con buena luz y evita reflejos.</p>
    </div>
  );
}
