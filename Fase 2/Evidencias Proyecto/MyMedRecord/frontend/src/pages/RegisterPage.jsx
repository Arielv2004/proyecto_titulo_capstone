import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { validateRut, formatRut } from '../utils/rutValidator';

import {
  HeartHandshake,
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
  Search,
  Building2,
  MapPin,
  PlusCircle,
  X,
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
    professionalRegistry: '',
    specialty: '',
    institutionId: '',
    institutionNameOther: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rutTouched, setRutTouched] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Instituciones
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionsError, setInstitutionsError] = useState('');

  // Buscador
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [showInstitutionResults, setShowInstitutionResults] = useState(false);
  const [useOtherInstitution, setUseOtherInstitution] = useState(false);

  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const isDoctor = formData.role === 'MEDICO';

  // =====================================================
  // CARGAR INSTITUCIONES
  // =====================================================

  useEffect(() => {
    if (!isDoctor || institutions.length > 0) return;

    const loadInstitutions = async () => {
      setLoadingInstitutions(true);
      setInstitutionsError('');

      try {
        const response = await fetch(
          'http://localhost:5000/api/v1/health-institutions'
        );

        if (!response.ok) {
          throw new Error(
            'No fue posible cargar las instituciones de salud.'
          );
        }

        const data = await response.json();

        const list = Array.isArray(data)
          ? data
          : data.institutions || [];

        setInstitutions(list);
      } catch (err) {
        console.error(err);

        setInstitutionsError(
          'No se pudieron cargar las instituciones. Verifica que el backend esté ejecutándose.'
        );
      } finally {
        setLoadingInstitutions(false);
      }
    };

    loadInstitutions();
  }, [isDoctor, institutions.length]);

  useMetaTags(
    isDoctor ? 'Registro Médico' : 'Registro de Ficha Clínica',
    isDoctor
      ? 'Crea tu cuenta profesional en MyMedRecord.'
      : 'Crea tu cuenta de paciente en MyMedRecord.'
  );

  // =====================================================
  // RUT
  // =====================================================

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

  // =====================================================
  // INPUTS GENERALES
  // =====================================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =====================================================
  // CAMBIO DE TIPO DE CUENTA
  // =====================================================

  const handleRoleChange = (role) => {
    setFormData((current) => ({
      ...current,
      role,

      // Si vuelve a paciente, limpiamos los campos médicos.
      ...(role === 'PACIENTE'
        ? {
            professionalRegistry: '',
            specialty: '',
            institutionId: '',
            institutionNameOther: '',
          }
        : {}),
    }));

    if (role === 'PACIENTE') {
      setInstitutionSearch('');
      setUseOtherInstitution(false);
      setShowInstitutionResults(false);
    }
  };

  // =====================================================
  // BUSCADOR DE INSTITUCIONES
  // =====================================================

  const filteredInstitutions = useMemo(() => {
    const search = institutionSearch.trim().toLowerCase();

    if (!search) {
      return institutions.slice(0, 8);
    }

    return institutions
      .filter((institution) => {
        const searchableText = [
          institution.name,
          institution.institution_type,
          institution.commune,
          institution.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(search);
      })
      .slice(0, 8);
  }, [institutionSearch, institutions]);

  const selectedInstitution = useMemo(
    () =>
      institutions.find(
        (institution) => institution.id === formData.institutionId
      ),
    [institutions, formData.institutionId]
  );

  const handleInstitutionSearch = (e) => {
    const value = e.target.value;

    setInstitutionSearch(value);
    setShowInstitutionResults(true);

    // Si modifica la búsqueda después de haber seleccionado
    // una institución, eliminamos la selección anterior.
    if (formData.institutionId) {
      setFormData((current) => ({
        ...current,
        institutionId: '',
      }));
    }
  };

  const handleSelectInstitution = (institution) => {
    setFormData((current) => ({
      ...current,
      institutionId: institution.id,
      institutionNameOther: '',
    }));

    setInstitutionSearch(institution.name);
    setUseOtherInstitution(false);
    setShowInstitutionResults(false);
  };

  const handleClearInstitution = () => {
    setFormData((current) => ({
      ...current,
      institutionId: '',
    }));

    setInstitutionSearch('');
    setShowInstitutionResults(true);
  };

  const handleUseOtherInstitution = () => {
    setUseOtherInstitution(true);

    setFormData((current) => ({
      ...current,
      institutionId: '',
      institutionNameOther: '',
    }));

    setInstitutionSearch('');
    setShowInstitutionResults(false);
  };

  const handleReturnToInstitutionSearch = () => {
    setUseOtherInstitution(false);

    setFormData((current) => ({
      ...current,
      institutionId: '',
      institutionNameOther: '',
    }));

    setInstitutionSearch('');
    setShowInstitutionResults(false);
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateRut(formData.rut)) {
      alert(
        'Por favor ingresa un RUT chileno válido antes de continuar.'
      );
      return;
    }

    if (isDoctor) {
      if (!formData.professionalRegistry.trim()) {
        alert('Ingresa tu registro profesional.');
        return;
      }

      if (!formData.specialty.trim()) {
        alert('Ingresa tu especialidad médica.');
        return;
      }

      if (
        !formData.institutionId &&
        !formData.institutionNameOther.trim()
      ) {
        alert(
          'Selecciona una institución de salud o indica otra institución.'
        );
        return;
      }
    }

    const payload = {
      ...formData,

      institutionId:
        isDoctor && formData.institutionId
          ? formData.institutionId
          : null,

      institutionNameOther:
        isDoctor && formData.institutionNameOther.trim()
          ? formData.institutionNameOther.trim()
          : null,
    };

    const result = await register(payload);

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

  const doctorInstitutionValid =
    Boolean(formData.institutionId) ||
    Boolean(formData.institutionNameOther.trim());

  return (
    <div className="flex min-h-screen flex-col bg-canvas dark:bg-canvas text-body dark:text-ink transition-colors">

      {/* Header */}
      <header className="border-b border-line/80 dark:border-line bg-surface/90 dark:bg-surface/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-action text-on-action shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>

          <div>
            <span className="text-base font-extrabold text-ink dark:text-ink tracking-tight">MyMedRecord</span>

            <p className="text-xs text-muted dark:text-muted font-medium">
              Plataforma de Salud Digital Interoperable (Ley N° 21.668)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted dark:text-body bg-surface-muted dark:bg-surface-muted px-3 py-1 rounded-full border border-line dark:border-line">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Ley N° 21.668 & N° 20.584</span>
          </div>

          <ThemeToggle compact />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-6 sm:p-8 shadow-sm">

          {/* Selector Login / Registro */}
          <div className="flex p-1 mb-6 bg-surface-muted dark:bg-surface-muted/80 rounded-2xl border border-line dark:border-line/80">
            <Link
              to="/login"
              className="flex-1 py-2 text-center text-xs font-bold text-muted dark:text-muted hover:text-ink dark:hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </Link>

            <div className="flex-1 py-2 text-center text-xs font-bold bg-action text-on-action rounded-xl shadow-xs flex items-center justify-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-teal-300" />
              <span>Registrar Cuenta</span>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-black text-ink dark:text-ink tracking-tight">
              {isDoctor
                ? 'Crear Cuenta Profesional'
                : 'Crear Ficha Médica'}
            </h1>

            <p className="text-xs text-muted dark:text-muted mt-1">
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
            <p className="text-xs font-bold text-body dark:text-body mb-2">
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
                    : 'border-line dark:border-line bg-canvas dark:bg-surface-muted/60 hover:border-accent-ink dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      formData.role === 'PACIENTE'
                        ? 'bg-action text-on-action'
                        : 'bg-surface dark:bg-surface-muted text-muted dark:text-body'
                    }`}
                  >
                    <UserRound className="w-4 h-4" />
                  </div>

                  <span className="text-sm font-extrabold text-ink dark:text-ink">
                    Paciente
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-muted dark:text-muted">
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
                    : 'border-line dark:border-line bg-canvas dark:bg-surface-muted/60 hover:border-teal-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      formData.role === 'MEDICO'
                        ? 'bg-action text-on-action'
                        : 'bg-surface dark:bg-surface-muted text-muted dark:text-body'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                  </div>

                  <span className="text-sm font-extrabold text-ink dark:text-ink">
                    Médico
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-muted dark:text-muted">
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
                <label className="block text-xs font-bold text-body dark:text-body mb-1">
                  Nombre
                </label>

                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ej.: María"
                  className="w-full px-3.5 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-body dark:text-body mb-1">
                  Apellido
                </label>

                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Ej.: González"
                  className="w-full px-3.5 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all"
                />
              </div>
            </div>

            {/* RUT */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-body dark:text-body">
                  RUT Chileno
                </label>

                {rutTouched && formData.rut && (
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
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
                placeholder="Ej.: 12.345.678-5"
                className={`w-full px-3.5 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border rounded-xl text-body dark:text-ink text-sm focus:outline-none transition-all font-mono ${
                  rutTouched && formData.rut
                    ? isRutValid
                      ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 focus:ring-2 focus:ring-emerald-100'
                      : 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-100'
                    : 'border-line dark:border-line focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-body dark:text-body mb-1">
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
                className="w-full px-3.5 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-body dark:text-body mb-1">
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
                  className="w-full pl-3.5 pr-11 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-muted hover:text-accent-ink dark:hover:text-teal-300 rounded-lg transition-all cursor-pointer"
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
                    <EyeOff className="w-4 h-4 text-accent-ink dark:text-teal-300" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted" />
                  )}
                </button>
              </div>
            </div>

            {/* Información profesional del médico */}
            {isDoctor && (
              <div className="space-y-3.5 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 p-4">
                <div>
                  <h2 className="text-sm font-extrabold text-ink dark:text-ink flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                    Información profesional
                  </h2>

                  <p className="text-xs text-muted dark:text-muted mt-1">
                    Estos antecedentes permiten asociar la cuenta a un perfil médico.
                    La cuenta quedará pendiente de verificación profesional.
                  </p>
                </div>

                {/* Registro profesional */}
                <div>
                  <label className="block text-xs font-bold text-body dark:text-body mb-1">
                    Registro profesional
                  </label>

                  <input
                    type="text"
                    name="professionalRegistry"
                    required={isDoctor}
                    value={formData.professionalRegistry}
                    onChange={handleChange}
                    placeholder="Ej: RNPI-123456"
                    className="w-full px-3.5 py-2.5 bg-surface dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-950/40 transition-all"
                  />
                </div>

                {/* Especialidad */}
                <div>
                  <label className="block text-xs font-bold text-body dark:text-body mb-1">
                    Especialidad
                  </label>

                  <input
                    type="text"
                    name="specialty"
                    required={isDoctor}
                    value={formData.specialty}
                    onChange={handleChange}
                    placeholder="Ej: Medicina General"
                    className="w-full px-3.5 py-2.5 bg-surface dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-950/40 transition-all"
                  />
                </div>

                {/* Institución */}
                <div>
                  <label className="block text-xs font-bold text-body dark:text-body mb-1">
                    Institución de salud
                  </label>

                  {!useOtherInstitution ? (
                    <>
                      {/* Institución seleccionada */}
                      {selectedInstitution ? (
                        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                              </div>

                              <div>
                                <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                                  {selectedInstitution.name}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                  {selectedInstitution.institution_type && (
                                    <span>
                                      {selectedInstitution.institution_type}
                                    </span>
                                  )}

                                  {(selectedInstitution.commune ||
                                    selectedInstitution.city) && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {selectedInstitution.commune ||
                                        selectedInstitution.city}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleClearInstitution}
                              className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer"
                              title="Cambiar institución"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Buscador */}
                          <div className="relative">
                            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />

                            <input
                              type="text"
                              value={institutionSearch}
                              onChange={handleInstitutionSearch}
                              onFocus={() =>
                                setShowInstitutionResults(true)
                              }
                              placeholder={
                                loadingInstitutions
                                  ? 'Cargando instituciones...'
                                  : 'Buscar hospital, clínica, CESFAM...'
                              }
                              disabled={loadingInstitutions}
                              autoComplete="off"
                              className="w-full pl-10 pr-3.5 py-2.5 bg-surface dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-950/40 transition-all disabled:opacity-60"
                            />

                            {/* Resultados */}
                            {showInstitutionResults &&
                              !loadingInstitutions && (
                                <div className="mt-2 overflow-hidden rounded-xl border border-line dark:border-line bg-surface dark:bg-surface-muted shadow-sm">
                                  {filteredInstitutions.length > 0 ? (
                                    <div className="max-h-52 overflow-y-auto">
                                      {filteredInstitutions.map(
                                        (institution) => (
                                          <button
                                            key={institution.id}
                                            type="button"
                                            onClick={() =>
                                              handleSelectInstitution(
                                                institution
                                              )
                                            }
                                            className="w-full px-3 py-2.5 flex items-start gap-2.5 text-left border-b last:border-b-0 border-stone-100 dark:border-line hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors cursor-pointer"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                                              <Building2 className="w-4 h-4 text-accent-ink dark:text-teal-300" />
                                            </div>

                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-body dark:text-ink">
                                                {institution.name}
                                              </p>

                                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted dark:text-muted">
                                                {institution.institution_type && (
                                                  <span>
                                                    {
                                                      institution.institution_type
                                                    }
                                                  </span>
                                                )}

                                                {(institution.commune ||
                                                  institution.city) && (
                                                  <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {institution.commune ||
                                                      institution.city}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className="px-3 py-3 text-center">
                                      <p className="text-xs font-semibold text-muted dark:text-body">
                                        No encontramos esa institución.
                                      </p>

                                      <p className="text-xs text-muted dark:text-muted mt-1">
                                        Puedes ingresarla manualmente.
                                      </p>
                                    </div>
                                  )}

                                  {/* Otra institución */}
                                  <button
                                    type="button"
                                    onClick={handleUseOtherInstitution}
                                    className="w-full px-3 py-2.5 flex items-center gap-2 text-left bg-canvas dark:bg-surface/70 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer border-t border-line dark:border-line"
                                  >
                                    <PlusCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />

                                    <div>
                                      <p className="text-xs font-bold text-body dark:text-body">
                                        Mi institución no aparece
                                      </p>

                                      <p className="text-xs text-muted dark:text-muted">
                                        Ingresar el nombre manualmente
                                      </p>
                                    </div>
                                  </button>
                                </div>
                              )}
                          </div>

                          {!showInstitutionResults && (
                            <button
                              type="button"
                              onClick={handleUseOtherInstitution}
                              className="mt-2 text-xs font-bold text-accent-ink dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Mi institución no aparece
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    /* Institución manual */
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-300" />

                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Otra institución
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleReturnToInstitutionSearch}
                          className="text-xs font-bold text-accent-ink dark:text-teal-300 hover:underline cursor-pointer"
                        >
                          Volver al buscador
                        </button>
                      </div>

                      <input
                        type="text"
                        name="institutionNameOther"
                        value={formData.institutionNameOther}
                        onChange={handleChange}
                        placeholder="Ej: Centro Médico Los Alerces"
                        maxLength={200}
                        autoFocus
                        className="w-full px-3.5 py-2.5 bg-surface dark:bg-surface-muted/80 border border-amber-300 dark:border-amber-800 rounded-xl text-body dark:text-ink text-sm focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-950/40 transition-all"
                      />

                      <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                        Esta institución será informada manualmente y podrá
                        validarse junto con los antecedentes profesionales.
                      </p>
                    </div>
                  )}

                  {institutionsError && (
                    <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {institutionsError}
                    </p>
                  )}
                </div>

                {/* Aviso de verificación */}
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />

                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                    Registrarse como médico no habilita automáticamente el acceso
                    a fichas clínicas. El perfil profesional debe quedar
                    verificado antes de aparecer disponible para los pacientes.
                  </p>
                </div>
              </div>
            )}

            {/* Resumen del tipo de cuenta */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isDoctor
                  ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900'
                  : 'bg-canvas dark:bg-surface-muted/60 border-line dark:border-line'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-body dark:text-body block">
                  Tipo de Cuenta
                </span>

                <span className="text-xs text-muted dark:text-muted">
                  {isDoctor
                    ? 'Cuenta profesional para acceso clínico autorizado'
                    : 'Titular y dueño de su historial clínico'}
                </span>
              </div>

              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0 border ${
                  isDoctor
                    ? 'text-teal-800 dark:text-teal-300 bg-surface dark:bg-teal-950/60 border-teal-300 dark:border-teal-800'
                    : 'text-accent-ink dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
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
                loadingInstitutions ||
                (formData.rut && !isRutValid) ||
                (isDoctor &&
                  (!formData.professionalRegistry.trim() ||
                    !formData.specialty.trim() ||
                    !doctorInstitutionValid))
              }
              className="w-full mt-3 py-3 bg-action hover:bg-action-hover active:scale-[0.99] text-on-action font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed"
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
          <div className="mt-5 text-center text-xs text-muted dark:text-muted">
            ¿Ya tienes una cuenta registrada?{' '}

            <Link
              to="/login"
              className="text-accent-ink dark:text-teal-300 hover:underline font-bold"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted dark:text-muted border-t border-line dark:border-line bg-surface dark:bg-surface transition-colors">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-1">
          <Link
            to="/privacy"
            className="hover:text-accent-ink dark:hover:text-teal-300 hover:underline"
          >
            Política de Privacidad
          </Link>

          <span>·</span>

          <Link
            to="/terms"
            className="hover:text-accent-ink dark:hover:text-teal-300 hover:underline"
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
