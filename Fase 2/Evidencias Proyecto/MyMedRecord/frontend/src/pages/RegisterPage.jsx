import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { validateRut, formatRut } from '../utils/rutValidator';

import {
  HeartHandshake,
  Lock,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
  UserRound,
  Stethoscope,
} from 'lucide-react';

import { ThemeToggle } from '../components/common/ThemeToggle';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    rut: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'PACIENTE',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rutTouched, setRutTouched] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const isDoctor = formData.role === 'MEDICO';

  useMetaTags(
    isDoctor ? 'Registro Médico' : 'Registro de Ficha Clínica',
    isDoctor
      ? 'Crea tu cuenta profesional en MyMedRecord.'
      : 'Crea tu cuenta de paciente en MyMedRecord.'
  );

  const isRutValid =
    formData.rut.trim() !== '' && validateRut(formData.rut);

  const handleRutChange = (e) => {
    const rawVal = e.target.value;
    const formatted = formatRut(rawVal);

    setFormData({
      ...formData,
      rut: formatted,
    });

    setRutTouched(true);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (role) => {
    setFormData({
      ...formData,
      role,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateRut(formData.rut)) {
      alert(
        'Por favor ingresa un RUT chileno válido antes de continuar.'
      );
      return;
    }

    const result = await register(formData);

    if (result.success) {
      setRegistrationSuccess(true);

      setTimeout(() => {
        if (result.user?.role === 'MEDICO') {
          navigate('/doctor');
        } else {
          navigate('/patient');
        }
      }, 900);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Franja superior institucional */}
      <div className="h-1.5 w-full chile-banner" />

      {/* Header */}
      <header className="border-b border-stone-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>

          <div>
            <span className="text-base font-extrabold text-blue-950 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
              MyMedRecord

              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-teal-300 rounded border border-blue-200/60 dark:border-blue-800">
                Chile
              </span>
            </span>

            <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
              Plataforma de Salud Digital Interoperable (Ley N° 21.668)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-stone-200 dark:border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />

            <span>Ley N° 21.668 & N° 20.584</span>
          </div>

          <ThemeToggle compact />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          
          {/* Selector Login / Registro */}
          <div className="flex p-1 mb-6 bg-stone-100 dark:bg-slate-800/80 rounded-2xl border border-stone-200 dark:border-slate-700/80">
            <Link
              to="/login"
              className="flex-1 py-2 text-center text-xs font-bold text-stone-600 dark:text-slate-400 hover:text-blue-950 dark:hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </Link>

            <div className="flex-1 py-2 text-center text-xs font-bold bg-blue-900 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-teal-300" />
              <span>Registrar Cuenta</span>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-black text-blue-950 dark:text-slate-100 tracking-tight">
              {isDoctor
                ? 'Crear Cuenta Profesional'
                : 'Crear Ficha Médica'}
            </h1>

            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              {isDoctor ? (
                <>
                  Registro de cuenta para{' '}
                  <strong>Profesional Médico</strong>.
                </>
              ) : (
                <>
                  Registro seguro de cuenta personal como{' '}
                  <strong>Paciente Titular</strong>.
                </>
              )}
            </p>
          </div>

          {/* Selector de tipo de cuenta */}
          <div className="mb-5">
            <p className="text-xs font-bold text-stone-700 dark:text-slate-300 mb-2">
              Selecciona el tipo de cuenta
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Paciente */}
              <button
                type="button"
                onClick={() => handleRoleChange('PACIENTE')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  formData.role === 'PACIENTE'
                    ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-100 dark:ring-blue-950'
                    : 'border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      formData.role === 'PACIENTE'
                        ? 'bg-blue-900 text-white'
                        : 'bg-white dark:bg-slate-700 text-stone-500 dark:text-slate-300'
                    }`}
                  >
                    <UserRound className="w-4 h-4" />
                  </div>

                  <span className="text-sm font-extrabold text-blue-950 dark:text-slate-100">
                    Paciente
                  </span>
                </div>

                <p className="text-[10px] leading-relaxed text-stone-500 dark:text-slate-400">
                  Gestiona tu historial y documentos médicos.
                </p>
              </button>

              {/* Médico */}
              <button
                type="button"
                onClick={() => handleRoleChange('MEDICO')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  formData.role === 'MEDICO'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 ring-2 ring-teal-100 dark:ring-teal-950'
                    : 'border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/60 hover:border-teal-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      formData.role === 'MEDICO'
                        ? 'bg-teal-700 text-white'
                        : 'bg-white dark:bg-slate-700 text-stone-500 dark:text-slate-300'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                  </div>

                  <span className="text-sm font-extrabold text-blue-950 dark:text-slate-100">
                    Médico
                  </span>
                </div>

                <p className="text-[10px] leading-relaxed text-stone-500 dark:text-slate-400">
                  Accede a fichas autorizadas por pacientes.
                </p>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          {/* Registro exitoso */}
          {registrationSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

              <span>
                ¡Cuenta creada con éxito! Iniciando sesión en tu portal...
              </span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Nombre y apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                  Nombre
                </label>

                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ignacio"
                  className="w-full px-3.5 py-2.5 bg-stone-50/80 dark:bg-slate-800/80 border border-stone-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                  Apellido
                </label>

                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Pérez"
                  className="w-full px-3.5 py-2.5 bg-stone-50/80 dark:bg-slate-800/80 border border-stone-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all"
                />
              </div>
            </div>

            {/* RUT */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  RUT Chileno
                </label>

                {rutTouched && formData.rut && (
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      isRutValid
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isRutValid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>RUT Válido</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Dígito verificador inválido</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <input
                type="text"
                name="rut"
                required
                value={formData.rut}
                onChange={handleRutChange}
                placeholder="12.345.678-9"
                className={`w-full px-3.5 py-2.5 bg-stone-50/80 dark:bg-slate-800/80 border rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none transition-all font-mono ${
                  rutTouched && formData.rut
                    ? isRutValid
                      ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 focus:ring-2 focus:ring-emerald-100'
                      : 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-100'
                    : 'border-stone-300 dark:border-slate-700 focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                Correo Electrónico
              </label>

              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={
                  isDoctor
                    ? 'medico@salud.cl'
                    : 'correo@ejemplo.cl'
                }
                className="w-full px-3.5 py-2.5 bg-stone-50/80 dark:bg-slate-800/80 border border-stone-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                Contraseña
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-3.5 pr-11 py-2.5 bg-stone-50/80 dark:bg-slate-800/80 border border-stone-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-stone-400 hover:text-blue-900 dark:hover:text-teal-300 rounded-lg transition-all cursor-pointer"
                  title={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Ver contraseña'
                  }
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Ver contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-blue-900 dark:text-teal-300" />
                  ) : (
                    <Eye className="w-4 h-4 text-stone-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Resumen del tipo de cuenta */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isDoctor
                  ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900'
                  : 'bg-stone-50 dark:bg-slate-800/60 border-stone-200 dark:border-slate-700'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-stone-700 dark:text-slate-300 block">
                  Tipo de Cuenta
                </span>

                <span className="text-[11px] text-stone-500 dark:text-slate-400">
                  {isDoctor
                    ? 'Cuenta profesional para acceso clínico autorizado'
                    : 'Titular y dueño de su historial clínico'}
                </span>
              </div>

              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0 border ${
                  isDoctor
                    ? 'text-teal-800 dark:text-teal-300 bg-white dark:bg-teal-950/60 border-teal-300 dark:border-teal-800'
                    : 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
                }`}
              >
                {isDoctor ? 'Médico' : 'Paciente'}
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                (formData.rut && !isRutValid)
              }
              className="w-full mt-3 py-3 bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              <span>
                {isLoading
                  ? 'Registrando cuenta...'
                  : isDoctor
                    ? 'Crear Cuenta Médica e Iniciar Sesión'
                    : 'Crear Cuenta e Iniciar Sesión'}
              </span>

              <ArrowRight className="w-4 h-4 text-teal-300" />
            </button>
          </form>

          {/* Login */}
          <div className="mt-5 text-center text-xs text-stone-600 dark:text-slate-400">
            ¿Ya tienes una cuenta registrada?{' '}

            <Link
              to="/login"
              className="text-blue-800 dark:text-teal-300 hover:underline font-bold"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-stone-400 dark:text-slate-500 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-1">
          <Link
            to="/privacy"
            className="hover:text-blue-900 dark:hover:text-teal-300 hover:underline"
          >
            Política de Privacidad
          </Link>

          <span>·</span>

          <Link
            to="/terms"
            className="hover:text-blue-900 dark:hover:text-teal-300 hover:underline"
          >
            Términos y Condiciones
          </Link>
        </div>

        <div>
          MyMedRecord · República de Chile · Plataforma de Salud Digital
          Interoperable
        </div>
      </footer>
    </div>
  );
};