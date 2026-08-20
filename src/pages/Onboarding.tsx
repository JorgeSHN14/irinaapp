import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import StepIndicator from '../components/ui/StepIndicator';
import Button from '../components/ui/Button';
import StepPersonal from '../components/wizard/StepPersonal';
import StepClinico from '../components/wizard/StepClinico';
import StepFarmacos from '../components/wizard/StepFarmacos';
import StepObjetivo from '../components/wizard/StepObjetivo';
import { calcularResultados } from '../utils/formulas';
import { usePatient } from '../App';
import type { CondicionMedica, NivelActividad, Sexo, ComposicionCorporal } from '../types';

interface FormData {
  nombre: string;
  apellido: string;
  cedula: string;
  edad: number;
  sexo: Sexo | '';
  pesoKg: number;
  tallaCm: number;
  circunferenciaCinturaCm: number;
  circunferenciaCaderaCm: number;
  composicionCorporal?: ComposicionCorporal;
  condiciones: CondicionMedica[];
  laboratorios: { glucosa?: number; insulina?: number; homaIr?: number; presionArterial?: string; perfilLipidico?: string; };
  medicamentos: string[];
  medicamentosActuales: string;
  restriccionesFisicas: string[];
  alergias?: string[];
  apoyoFamiliar: boolean;
  motivacion: string;
  objetivo: string[];
  nivelActividad: NivelActividad | 0;
}

const STEP_LABELS = ['Personal', 'Clínico', 'Fármacos', 'Psicosocial'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { dispatch } = usePatient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    nombre: '',
    apellido: '',
    cedula: '',
    edad: 0,
    sexo: '',
    pesoKg: 0,
    tallaCm: 0,
    circunferenciaCinturaCm: 0,
    circunferenciaCaderaCm: 0,
    composicionCorporal: {},
    condiciones: [],
    laboratorios: {},
    medicamentos: [],
    medicamentosActuales: '',
    restriccionesFisicas: [],
    apoyoFamiliar: false,
    motivacion: '',
    objetivo: [],
    nivelActividad: 0,
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
    form.apellido.trim().length > 0 &&
    form.cedula.trim().length > 0 &&
    form.sexo !== '' &&
    form.edad > 0 &&
    form.pesoKg > 0 &&
    form.tallaCm > 0 &&
    form.circunferenciaCinturaCm > 0 &&
    form.circunferenciaCaderaCm > 0;

  const isStep2Valid = form.condiciones.length > 0;

  const isStep3Valid = true; // Opcional

  const isStep4Valid = form.objetivo.length > 0 && form.nivelActividad > 0 && form.motivacion.trim().length > 0;

  const canProceed = [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid][step - 1];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const evaluacion = {
      userId: 'demo-user',
      nombre: form.nombre,
      fecha: new Date().toISOString(),
      edad: form.edad,
      sexo: form.sexo as Sexo,
      pesoKg: form.pesoKg,
      tallaCm: form.tallaCm,
      nivelActividad: form.nivelActividad as NivelActividad,
      circunferenciaCinturaCm: form.circunferenciaCinturaCm,
      circunferenciaCaderaCm: form.circunferenciaCaderaCm,
      objetivo: form.objetivo,
      condiciones: form.condiciones.filter((c) => c !== 'ninguno'),
      laboratorios: form.laboratorios,
      medicamentos: form.medicamentos,
      medicamentosActuales: form.medicamentosActuales,
      restriccionesFisicas: form.restriccionesFisicas,
      alergias: form.alergias || [],
      apoyoFamiliar: form.apoyoFamiliar,
      motivacion: form.motivacion,
    };

    const resultados = calcularResultados(evaluacion);

    dispatch({ type: 'SET_EVALUACION', payload: evaluacion });
    dispatch({ type: 'SET_RESULTADOS', payload: resultados });

    navigate('/dashboard');
  };

  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col safe-area-top overflow-x-hidden">
      <div className="flex-1 flex flex-col w-full max-w-lg mx-auto">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-salud-blue to-salud-green flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">A</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-text-primary">AVIVA</h1>
            <p className="text-xs text-text-tertiary">Evaluación Inicial</p>
          </div>
        </div>
        <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-6 overflow-y-auto">
        {step === 1 && (
          <StepPersonal
            nombre={form.nombre}
            apellido={form.apellido}
            cedula={form.cedula}
            edad={form.edad}
            sexo={form.sexo}
            pesoKg={form.pesoKg}
            tallaCm={form.tallaCm}
            circunferenciaCinturaCm={form.circunferenciaCinturaCm}
            circunferenciaCaderaCm={form.circunferenciaCaderaCm}
            composicionCorporal={form.composicionCorporal}
            onUpdate={updateField}
          />
        )}
        {step === 2 && (
          <StepClinico 
            condiciones={form.condiciones} 
            laboratorios={form.laboratorios}
            onToggle={toggleCondicion} 
            onUpdateLaboratorio={updateLaboratorio}
          />
        )}
        {step === 3 && (
          <StepFarmacos 
            medicamentos={form.medicamentos}
            medicamentosActuales={form.medicamentosActuales}
            restriccionesFisicas={form.restriccionesFisicas}
            alergias={form.alergias || []}
            onToggleArray={toggleArray}
            onUpdate={updateField}
          />
        )}
        {step === 4 && (
          <StepObjetivo
            objetivo={form.objetivo}
            nivelActividad={form.nivelActividad}
            motivacion={form.motivacion}
            apoyoFamiliar={form.apoyoFamiliar}
            onUpdate={updateField}
          />
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="px-5 pb-6 pt-3 border-t border-border/50 bg-bg-card/80 backdrop-blur-sm safe-area-bottom">
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              icon={<ArrowLeft size={20} />}
              className="flex-shrink-0"
            >
              Atrás
            </Button>
          )}
          <Button
            fullWidth
            disabled={!canProceed}
            onClick={handleNext}
            icon={step === 4 ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
          >
            {step === 4 ? 'Calcular resultados' : 'Siguiente'}
          </Button>
        </div>
      </footer>
      </div>
    </div>
  );
}
