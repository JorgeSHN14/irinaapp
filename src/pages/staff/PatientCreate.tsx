import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useStaff } from '../../contexts/StaffContext';
import StepIndicator from '../../components/ui/StepIndicator';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import StepPersonal from '../../components/wizard/StepPersonal';
import StepClinico from '../../components/wizard/StepClinico';
import StepFarmacos from '../../components/wizard/StepFarmacos';
import StepObjetivo from '../../components/wizard/StepObjetivo';
import type { CondicionMedica, NivelActividad, Sexo } from '../../types';
import type { CreatePatientData } from '../../types/patients';

// =============================================
// Staff: Crear Nuevo Paciente
// Reutiliza los steps del wizard original
// =============================================

const STEP_LABELS = ['Personales', 'Clínico', 'Fármacos', 'Objetivos'];

export default function PatientCreate() {
  const navigate = useNavigate();
  const { createPatient } = useStaff();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreatePatientData>({
    email: '',
    passwordTemporal: '',
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: '',
    fechaNacimiento: '',
    edad: 0,
    sexo: '' as Sexo, // Coerced for initial empty state
    pesoKg: 0,
    tallaCm: 0,
    cinturaCm: 0,
    caderaCm: 0,
    composicionCorporal: {},
    condiciones: [],
    laboratorios: {},
    medicamentos: [],
    medicamentosActuales: '',
    restriccionesFisicas: [],
    objetivo: [], // Inicialmente vacío
    nivelActividad: 0 as NivelActividad, // Coerced for initial empty state
    apoyoFamiliar: false,
    motivacion: '',
  });

  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleCondicion = useCallback((condicion: CondicionMedica) => {
    setForm((prev) => {
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
    setForm((prev) => ({
      ...prev,
      laboratorios: { ...prev.laboratorios, [field]: value },
    }));
  }, []);

  const toggleArray = useCallback((field: 'medicamentos' | 'restriccionesFisicas' | 'alergias', item: string) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  }, []);

  // Validaciones por paso
  const isStep1Valid =
    form.nombre.trim().length > 0 &&
    form.email.includes('@') &&
    form.cedula.trim().length >= 5 &&
    form.sexo !== '' as Sexo &&
    form.edad > 0 &&
    form.pesoKg > 0 &&
    form.tallaCm > 0;

  const isStep2Valid = form.condiciones.length > 0;

  const isStep3Valid = true; // Opcional

  const isStep4Valid = form.objetivo.length > 0 && form.nivelActividad > 0;

  const canProceed = [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid][step - 1];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // El password temporal será igual a la cédula
      const patientToCreate = {
        ...form,
        passwordTemporal: form.cedula
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newPatient = await createPatient(patientToCreate);
      navigate(`/staff/pacientes/${newPatient.id}`);
    } catch (error: any) {
      console.error('Error al crear paciente', error);
      alert(`Error al crear paciente: ${error?.message || 'Error desconocido'}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto min-w-0 overflow-x-hidden space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/staff/pacientes')}
          className="p-2 rounded-full hover:bg-bg-elevated transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Registrar Paciente
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Completa la ficha inicial para dar de alta al paciente en la plataforma.
          </p>
        </div>
      </div>

      <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />

      <div className="mt-8">
        {step === 1 && (
          <div className="space-y-6 animate-slide-right">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
                <ShieldAlert size={18} className="text-salud-blue" />
                <h2 className="text-base font-bold text-text-primary">Acceso a la Plataforma</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Correo Electrónico *
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="paciente@correo.com"
                  />
                  <p className="text-xs text-text-tertiary mt-1">El paciente usará este correo para ingresar.</p>
                </div>
                <div>
                  <div className="bg-bg-elevated border border-border/40 p-4 rounded-[var(--radius-md)] h-full flex flex-col justify-center">
                    <p className="text-sm font-semibold text-text-primary mb-1">Contraseña Automática</p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      La contraseña temporal del paciente se generará automáticamente usando su <strong className="text-salud-blue">Número de Cédula</strong>. Al iniciar sesión, se le pedirá que la cambie.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <StepPersonal
                nombre={form.nombre}
                apellido={form.apellido}
                cedula={form.cedula}
                telefono={form.telefono}
                fechaNacimiento={form.fechaNacimiento}
                tipoSangre={form.tipoSangre}
                edad={form.edad}
                sexo={form.sexo}
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

        {step === 2 && (
          <div className="animate-slide-right">
            <Card padding="lg">
              <StepClinico 
                condiciones={form.condiciones} 
                laboratorios={form.laboratorios || {}}
                onToggle={toggleCondicion} 
                onUpdateLaboratorio={updateLaboratorio}
              />
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-right">
            <Card padding="lg">
              <StepFarmacos 
                medicamentos={form.medicamentos}
                medicamentosActuales={form.medicamentosActuales || ''}
                restriccionesFisicas={form.restriccionesFisicas}
                alergias={form.alergias || []}
                onToggleArray={toggleArray}
                onUpdate={updateField}
              />
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-right">
            <Card padding="lg">
              <StepObjetivo
                objetivo={form.objetivo}
                nivelActividad={form.nivelActividad}
                motivacion={form.motivacion}
                apoyoFamiliar={form.apoyoFamiliar}
                onUpdate={updateField}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-6 border-t border-border/50 flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate('/staff/pacientes');
            }
          }}
        >
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </Button>

        <Button
          disabled={!canProceed || isSubmitting}
          onClick={handleNext}
          icon={isSubmitting ? undefined : (step === 4 ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />)}
        >
          {isSubmitting ? 'Registrando...' : (step === 4 ? 'Finalizar Registro' : 'Siguiente')}
        </Button>
      </div>
    </div>
  );
}
