import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  User,
  HeartPulse,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { useStaff } from '../../contexts/StaffContext';
import type { UpdatePatientData } from '../../contexts/StaffContext';
import StepIndicator from '../../components/ui/StepIndicator';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StepPersonal from '../../components/wizard/StepPersonal';
import StepClinico from '../../components/wizard/StepClinico';
import StepObjetivo from '../../components/wizard/StepObjetivo';
import EmptyState from '../../components/ui/EmptyState';
import type { CondicionMedica, NivelActividad, Sexo } from '../../types';
import type { PatientStatus } from '../../types/patients';

// =============================================
// Staff: Editar Paciente
// Reutiliza los steps del wizard, pero precarga
// todos los datos existentes del paciente.
// NO modifica email/contraseña ni evaluaciones.
// =============================================

const STEP_LABELS = ['Personales', 'Clínico', 'Objetivos'];

type EditForm = UpdatePatientData & {
  // Campos extra que usan los steps wizard pero que
  // se descartan al guardar (mantenidos en evaluaciones)
  composicionCorporal: Record<string, any>;
  laboratorios: Record<string, any>;
};

export default function PatientEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatientById, updatePatient } = useStaff();

  const patient = id ? getPatientById(id) : undefined;

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  // Precarga del formulario con los datos del paciente
  useEffect(() => {
    if (!patient) return;
    setForm({
      // Personales
      nombre: patient.nombre,
      apellido: patient.apellido || '',
      cedula: patient.cedula,
      telefono: patient.telefono || '',
      fechaNacimiento: patient.fechaNacimiento || '',
      edad: patient.edad,
      sexo: patient.sexo,
      tipoSangre: patient.tipoSangre || '',
      alergias: patient.alergias || [],
      // Antropometría
      pesoKg: patient.pesoKg,
      tallaCm: patient.tallaCm,
      cinturaCm: patient.cinturaCm,
      caderaCm: patient.caderaCm,
      composicionCorporal: patient.composicionCorporal || {},
      // Clínico
      condiciones: patient.condiciones,
      laboratorios: patient.laboratorios || {},
      // Objetivos
      objetivo: patient.objetivo,
      nivelActividad: patient.nivelActividad,
      // Estado
      estatus: patient.estatus,
    });
  }, [patient]);

  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const toggleCondicion = useCallback((condicion: CondicionMedica) => {
    setForm((prev) => {
      if (!prev) return prev;
      if (condicion === 'ninguno') {
        return { ...prev, condiciones: ['ninguno'] };
      }
      const filtered = prev.condiciones.filter((c) => c !== 'ninguno');
      const exists = filtered.includes(condicion);
      return {
        ...prev,
        condiciones: exists
          ? filtered.filter((c) => c !== condicion)
          : [...filtered, condicion],
      };
    });
  }, []);

  const updateLaboratorio = useCallback((field: string, value: string | number) => {
    setForm((prev) =>
      prev
        ? { ...prev, laboratorios: { ...prev.laboratorios, [field]: value } }
        : prev
    );
  }, []);

  // Validaciones por paso
  const isStep1Valid = form
    ? form.nombre.trim().length > 0 &&
      form.cedula.trim().length >= 5 &&
      (form.sexo as string) !== '' &&
      form.edad > 0 &&
      form.pesoKg > 0 &&
      form.tallaCm > 0
    : false;

  const isStep2Valid = form ? form.condiciones.length > 0 : false;

  const isStep3Valid = form
    ? form.objetivo.length > 0 && form.nivelActividad > 0
    : false;

  const canProceed = [isStep1Valid, isStep2Valid, isStep3Valid][step - 1];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!id || !form) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: UpdatePatientData = {
        nombre: form.nombre,
        apellido: form.apellido,
        cedula: form.cedula,
        telefono: form.telefono,
        fechaNacimiento: form.fechaNacimiento,
        edad: form.edad,
        sexo: form.sexo as Sexo,
        tipoSangre: form.tipoSangre,
        alergias: form.alergias,
        pesoKg: form.pesoKg,
        tallaCm: form.tallaCm,
        cinturaCm: form.cinturaCm,
        caderaCm: form.caderaCm,
        condiciones: form.condiciones as CondicionMedica[],
        objetivo: form.objetivo,
        nivelActividad: form.nivelActividad as NivelActividad,
        estatus: form.estatus as PatientStatus,
      };
      await updatePatient(id, payload);
      navigate(`/staff/pacientes/${id}`);
    } catch (err: any) {
      console.error('Error al actualizar paciente:', err);
      setError(err?.message || 'Ocurrió un error al guardar los cambios.');
      setIsSubmitting(false);
    }
  };

  // ─── Loading / Not found ─────────────────────────
  if (!patient || !form) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <button
          onClick={() => navigate('/staff/pacientes')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} /> Volver al directorio
        </button>
        <EmptyState
          title="Paciente no encontrado"
          description="El paciente que intentas editar no existe o fue eliminado del sistema."
          action={
            <Button onClick={() => navigate('/staff/pacientes')}>
              Ir al directorio
            </Button>
          }
        />
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────
  return (
    <div className="w-full mx-auto min-w-0 overflow-x-hidden space-y-6 animate-fade-in pb-12">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() =>
            step > 1
              ? (setStep(step - 1), window.scrollTo({ top: 0, behavior: 'smooth' }))
              : navigate(`/staff/pacientes/${id}`)
          }
          className="p-2 rounded-full hover:bg-bg-elevated transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Editar Paciente
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Modifica los datos de{' '}
            <span className="font-semibold text-text-primary">
              {patient.nombre} {patient.apellido || ''}
            </span>
            . El acceso a la plataforma no se verá afectado.
          </p>
        </div>
      </div>

      {/* ── Alerta: email no editable ── */}
      <div className="flex items-start gap-3 bg-bg-elevated border border-border/50 rounded-[var(--radius-md)] p-3">
        <AlertTriangle size={16} className="text-salud-amber flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          El <strong className="text-text-primary">correo electrónico</strong> y la{' '}
          <strong className="text-text-primary">contraseña</strong> del paciente no pueden
          modificarse desde aquí. Para cambiarlos, usa la gestión de usuarios de Supabase.
        </p>
      </div>

      {/* ── Estado del paciente ── */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-salud-blue" />
          <h2 className="text-sm font-bold text-text-primary">Estado del Paciente</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['activo', 'inactivo', 'alta'] as PatientStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => updateField('estatus', s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer capitalize ${
                form.estatus === s
                  ? s === 'activo'
                    ? 'bg-salud-green text-white border-salud-green'
                    : s === 'inactivo'
                    ? 'bg-salud-amber text-white border-salud-amber'
                    : 'bg-salud-blue text-white border-salud-blue'
                  : 'bg-bg-elevated text-text-secondary border-border/40 hover:border-border'
              }`}
            >
              {s === 'activo' ? 'Activo' : s === 'inactivo' ? 'Inactivo' : 'Alta médica'}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Step Indicator ── */}
      <StepIndicator currentStep={step} totalSteps={3} labels={STEP_LABELS} />

      {/* ── Steps Content ── */}
      <div className="mt-8">

        {/* PASO 1: Datos Personales */}
        {step === 1 && (
          <div className="animate-slide-right">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
                <User size={18} className="text-salud-blue" />
                <h2 className="text-base font-bold text-text-primary">
                  Información Personal y Antropométrica
                </h2>
              </div>
              <StepPersonal
                nombre={form.nombre}
                apellido={form.apellido}
                cedula={form.cedula}
                telefono={form.telefono}
                fechaNacimiento={form.fechaNacimiento}
                tipoSangre={form.tipoSangre}
                edad={form.edad}
                sexo={form.sexo as Sexo}
                pesoKg={form.pesoKg}
                tallaCm={form.tallaCm}
                circunferenciaCinturaCm={form.cinturaCm}
                circunferenciaCaderaCm={form.caderaCm}
                composicionCorporal={form.composicionCorporal}
                onUpdate={updateField}
              />
            </Card>
          </div>
        )}

        {/* PASO 2: Perfil Clínico */}
        {step === 2 && (
          <div className="animate-slide-right">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
                <HeartPulse size={18} className="text-salud-red" />
                <h2 className="text-base font-bold text-text-primary">
                  Condiciones Médicas y Laboratorios
                </h2>
              </div>
              <StepClinico
                condiciones={form.condiciones}
                laboratorios={form.laboratorios}
                onToggle={toggleCondicion}
                onUpdateLaboratorio={updateLaboratorio}
              />
            </Card>
          </div>
        )}

        {/* PASO 3: Objetivos */}
        {step === 3 && (
          <div className="animate-slide-right">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
                <Target size={18} className="text-salud-green" />
                <h2 className="text-base font-bold text-text-primary">
                  Objetivo y Nivel de Actividad
                </h2>
              </div>
              <StepObjetivo
                objetivo={form.objetivo}
                nivelActividad={form.nivelActividad as NivelActividad}
                motivacion={''}
                apoyoFamiliar={false}
                onUpdate={updateField}
              />
            </Card>
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-start gap-3 bg-salud-red/10 border border-salud-red/30 rounded-[var(--radius-md)] p-3">
          <AlertTriangle size={16} className="text-salud-red flex-shrink-0 mt-0.5" />
          <p className="text-xs text-salud-red font-medium">{error}</p>
        </div>
      )}

      {/* ── Footer Navigation ── */}
      <div className="pt-6 border-t border-border/50 flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate(`/staff/pacientes/${id}`);
            }
          }}
        >
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </Button>

        <Button
          disabled={!canProceed || isSubmitting}
          onClick={handleNext}
          icon={
            isSubmitting
              ? undefined
              : step === 3
              ? <CheckCircle2 size={18} />
              : <ArrowRight size={18} />
          }
        >
          {isSubmitting
            ? 'Guardando...'
            : step === 3
            ? 'Guardar Cambios'
            : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
