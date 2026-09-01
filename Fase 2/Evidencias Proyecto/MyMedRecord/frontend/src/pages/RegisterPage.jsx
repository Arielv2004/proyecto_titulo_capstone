import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { validateRut, formatRut } from '../utils/rutValidator';
import { 
  HeartHandshake, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

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
  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  useMetaTags('Registro de Ficha Clínica', 'Crea tu cuenta de paciente o médico en la red MyMedRecord de Chile.');

  const isRutValid = formData.rut.trim() !== '' && validateRut(formData.rut);

  const handleRutChange = (e) => {
    const rawVal = e.target.value;
    const formatted = formatRut(rawVal);
    setFormData({ ...formData, rut: formatted });
    setRutTouched(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateRut(formData.rut)) {
      alert('Por favor ingresa un RUT chileno válido antes de continuar.');
      return;
    }
    const result = await register(formData);
    if (result.success) {
      if (result.user.role === 'PACIENTE') navigate('/patient');
      else if (result.user.role === 'MEDICO') navigate('/doctor');
      else if (result.user.role === 'ADMIN') navigate('/admin');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-slate-800">
      <div className="h-1.5 w-full chile-banner" />

      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <span className="text-base font-bold text-blue-950 tracking-tight flex items-center gap-1.5">
              MyMedRecord
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200/60">Registro</span>
            </span>
            <p className="text-[11px] text-stone-500 font-medium">Creación de Ficha Clínica Digital</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Ley N° 21.668 & 20.584</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-blue-950 tracking-tight">Crear Cuenta</h1>
            <p className="text-xs text-stone-500 mt-1">
              Únete a la red unificada de salud de Chile con tu RUT y correo.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ignacio"
                  className="w-full px-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 text-sm focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Apellido</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Pérez"
                  className="w-full px-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 text-sm focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Input RUT con Validación de Algoritmo Módulo 11 en Tiempo Real */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">RUT Chileno</label>
                {rutTouched && formData.rut && (
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${isRutValid ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isRutValid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>RUT Válido (Módulo 11)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Dígito verificador no coincide</span>
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
                className={`w-full px-3.5 py-2.5 bg-stone-50/80 border rounded-xl text-slate-800 text-sm focus:outline-none transition-all font-mono ${
                  rutTouched && formData.rut
                    ? isRutValid
                      ? 'border-emerald-500 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-100'
                      : 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-100'
                    : 'border-stone-300 focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.cl"
                className="w-full px-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 text-sm focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Input Contraseña con Toggle de Visibilidad */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-3.5 pr-11 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 text-sm focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-stone-400 hover:text-blue-900 rounded-lg hover:bg-stone-100 transition-all cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-blue-900" />
                  ) : (
                    <Eye className="w-4 h-4 text-stone-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Tipo de Usuario</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 text-sm focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer font-medium"
              >
                <option value="PACIENTE">🧑‍💼 Paciente (Titular de Ficha Clínica)</option>
                <option value="MEDICO">👨‍⚕️ Médico / Profesional de la Salud</option>
                <option value="ADMIN">🛡️ Administrador del Sistema</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading || (formData.rut && !isRutValid)}
              className="w-full mt-3 py-3 bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Registrando...' : 'Completar Registro'}</span>
              <ArrowRight className="w-4 h-4 text-teal-300" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-stone-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-blue-800 hover:underline font-bold">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-1">
          <Link to="/privacy" className="hover:text-blue-900 hover:underline">Política de Privacidad</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-blue-900 hover:underline">Términos y Condiciones</Link>
        </div>
        <div>MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable</div>
      </footer>
    </div>
  );
};
