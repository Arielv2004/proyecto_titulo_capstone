
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Debes ingresar tu correo electrónico.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        email: cleanEmail,
      });

      setMessage(
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );

      setEmail('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No se pudo enviar la solicitud. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f6fa',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            color: '#163b65',
            marginBottom: '10px',
            textAlign: 'center',
          }}
        >
          MyMedRecord
        </h1>

        <h2
          style={{
            fontSize: '21px',
            textAlign: 'center',
            marginBottom: '12px',
            color: '#263445',
          }}
        >
          Recuperar contraseña
        </h2>

        <p
          style={{
            color: '#64748b',
            fontSize: '14px',
            textAlign: 'center',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}
        >
          Ingresa el correo electrónico asociado a tu cuenta.
          Si está registrado, recibirás un enlace para crear
          una nueva contraseña.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="recovery-email"
            style={{
              display: 'block',
              fontWeight: '600',
              fontSize: '14px',
              marginBottom: '8px',
              color: '#334155',
            }}
          >
            Correo electrónico
          </label>

          <input
            id="recovery-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            autoComplete="email"
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '15px',
              boxSizing: 'border-box',
              marginBottom: '18px',
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#94a3b8' : '#1769aa',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? 'Enviando solicitud...'
              : 'Enviar enlace de recuperación'}
          </button>
        </form>

        {message && (
          <div
            role="status"
            style={{
              marginTop: '20px',
              padding: '14px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              color: '#065f46',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: '20px',
              padding: '14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            textAlign: 'center',
            marginTop: '26px',
          }}
        >
          <Link
            to="/login"
            style={{
              color: '#1769aa',
              fontSize: '14px',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
