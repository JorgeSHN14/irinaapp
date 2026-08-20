import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, FileText, Scale, Activity, Target
} from 'lucide-react';
import { useStaff } from '../../contexts/StaffContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import type { NivelActividad, EvaluacionInicial } from '../../types/index';
import type { Evaluacion } from '../../types/patients';
import { useSystemOptions } from '../../contexts/SystemOptionsContext';
import { calcularHomaIr } from '../../utils/formulas';

// =============================================
// Staff: Nueva Evaluación de Paciente
// =============================================

export default function PatientEvaluate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatientById, getPatientEvaluations, addEvaluation } = useStaff();
  const { getOptionsByCategory } = useSystemOptions();
  
  const patient = id ? getPatientById(id) : undefined;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recalculateCalories, setRecalculateCalories] = useState(true);
  const [form, setForm] = useState<Partial<Evaluacion>>({
    pesoKg: 0,
    cinturaCm: 0,
    caderaCm: 0,
    nivelActividad: 1 as NivelActividad,
    objetivo: [],
    nivelEnergia: 5,
    calidadDigestion: 'buena',
    nivelAnsiedad: 'ninguna',
    notasProfesional: '',
    indicacionesPaciente: '',
  });

  // Pre-cargar datos del paciente de su última evaluación
  useEffect(() => {
    if (patient) {
      const evaluations = getPatientEvaluations(patient.id);
      const lastEval = evaluations[0];
      
      setForm({
        pesoKg: patient.pesoKg,
        cinturaCm: patient.cinturaCm,
        caderaCm: patient.caderaCm,
        nivelActividad: patient.nivelActividad,
        objetivo: patient.objetivo,
        condiciones: patient.condiciones,
        composicionCorporal: lastEval?.composicionCorporal || patient.composicionCorporal || {},
        laboratorios: lastEval?.laboratorios || {},
        medicamentos: lastEval?.medicamentos || [],
        restriccionesFisicas: lastEval?.restriccionesFisicas || [],
        apoyoFamiliar: lastEval?.apoyoFamiliar || true,
        motivacion: lastEval?.motivacion || '',
        nivelEnergia: 5,
        calidadDigestion: 'buena',
        nivelAnsiedad: 'ninguna',
        notasProfesional: '',
        indicacionesPaciente: '',
      });
    }
  }, [patient, getPatientEvaluations]);

  if (!patient) {
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
          description="El paciente que buscas no existe o ha sido eliminado."
          action={<Button onClick={() => navigate('/staff/pacientes')}>Ir al directorio</Button>}
        />
      </div>
    );
  }

  const updateField = (field: keyof Evaluacion, value: any) => {
    setForm((prev: Partial<Evaluacion>) => ({ ...prev, [field]: value }));
  };

  const updateLaboratorio = (field: string, value: any) => {
    setForm((prev) => {
      const newLabs = { ...(prev.laboratorios || {}), [field]: value };
      if ((field === 'glucosa' || field === 'insulina') && typeof value === 'number') {
        const gluc = field === 'glucosa' ? value : newLabs.glucosa;
        const ins = field === 'insulina' ? value : newLabs.insulina;
        const res = calcularHomaIr(gluc, ins);
        if (res.valor) newLabs.homaIr = res.valor;
      }
      return { ...prev, laboratorios: newLabs };
    });
  };

  const updateComposicion = (field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      composicionCorporal: { ...(prev.composicionCorporal || {}), [field]: value === '' ? undefined : value },
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Validar datos mínimos
      if (!form.pesoKg || !form.cinturaCm || !form.nivelActividad || !form.objetivo || form.objetivo.length === 0) {
        alert('Por favor completa los campos requeridos marcados con *');
        setIsSubmitting(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      
      const evaluationData: Omit<Evaluacion, 'id' | 'evaluadorId' | 'evaluadorNombre' | 'fecha' | 'resultados'> = {
        patientId: patient.id,
        pesoKg: form.pesoKg,
        tallaCm: patient.tallaCm, // Talla heredada
        cinturaCm: form.cinturaCm,
        caderaCm: form.caderaCm || patient.caderaCm,
        nivelActividad: form.nivelActividad,
        objetivo: form.objetivo,
        nivelEnergia: form.nivelEnergia,
        calidadDigestion: form.calidadDigestion,
        nivelAnsiedad: form.nivelAnsiedad,
        condiciones: patient.condiciones,
        composicionCorporal: form.composicionCorporal || {},
        laboratorios: form.laboratorios || {},
        medicamentos: form.medicamentos || [],
        medicamentosActuales: form.medicamentosActuales || '',
        restriccionesFisicas: form.restriccionesFisicas || [],
        apoyoFamiliar: form.apoyoFamiliar || true,
        motivacion: form.motivacion || '',
        notasProfesional: form.notasProfesional || '',
        indicacionesPaciente: form.indicacionesPaciente || '',
      };

      const measures: EvaluacionInicial = {
        userId: patient.userId,
        nombre: patient.nombre,
        fecha: new Date().toISOString(),
        edad: patient.edad,
        sexo: patient.sexo,
        pesoKg: form.pesoKg,
        tallaCm: patient.tallaCm,
        nivelActividad: form.nivelActividad,
        circunferenciaCinturaCm: form.cinturaCm,
        circunferenciaCaderaCm: form.caderaCm || patient.caderaCm,
        objetivo: form.objetivo,
        condiciones: patient.condiciones,
        composicionCorporal: form.composicionCorporal || {},
        laboratorios: form.laboratorios || {},
        medicamentos: form.medicamentos || [],
        medicamentosActuales: form.medicamentosActuales || '',
        restriccionesFisicas: form.restriccionesFisicas || [],
        alergias: patient.alergias || [],
        apoyoFamiliar: form.apoyoFamiliar || true,
        motivacion: form.motivacion || '',
      };

      await addEvaluation(patient.id, evaluationData, measures);
      navigate(`/staff/pacientes/${patient.id}`);
    } catch (error) {
      console.error('Error al guardar evaluación', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/staff/pacientes/${patient.id}`)}
          className="p-2 rounded-full hover:bg-bg-elevated transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Nueva Evaluación Clínica
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Registro de seguimiento para recalcular metas nutricionales.
            </p>
          </div>
          <div className="md:ml-auto flex items-center gap-3 bg-bg-elevated px-4 py-2 rounded-full">
            <Avatar nombre={patient.nombre} apellido={patient.apellido} size="sm" />
            <span className="font-bold text-sm text-text-primary">{patient.nombre} {patient.apellido}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Sección 1: Anamnesis y Feedback */}
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <Activity size={18} className="text-salud-purple" />
            <h2 className="text-base font-bold text-text-primary">Sección 1: Anamnesis y Adherencia</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Nivel de Energía (1-10)
              </label>
              <Input
                type="number"
                min="1" max="10"
                value={form.nivelEnergia || ''}
                onChange={(e) => updateField('nivelEnergia', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Digestión
              </label>
              <Select
                value={form.calidadDigestion || 'buena'}
                onChange={(e) => updateField('calidadDigestion', e.target.value as any)}
              >
                <option value="excelente">Excelente</option>
                <option value="buena">Buena</option>
                <option value="regular">Regular</option>
                <option value="mala">Mala</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Nivel de Ansiedad
              </label>
              <Select
                value={form.nivelAnsiedad || 'ninguna'}
                onChange={(e) => updateField('nivelAnsiedad', e.target.value as any)}
              >
                <option value="ninguna">Ninguna</option>
                <option value="baja">Baja</option>
                <option value="moderada">Moderada</option>
                <option value="alta">Alta</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Sección 2: Antropometría */}
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <Scale size={18} className="text-salud-blue" />
            <h2 className="text-base font-bold text-text-primary">Sección 2: Antropometría Actual</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Peso (kg) *
              </label>
              <Input
                type="number"
                step="0.1"
                value={form.pesoKg || ''}
                onChange={(e) => updateField('pesoKg', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Cintura (cm) *
              </label>
              <Input
                type="number"
                step="0.1"
                value={form.cinturaCm || ''}
                onChange={(e) => updateField('cinturaCm', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Cadera (cm) *
              </label>
              <Input
                type="number"
                step="0.1"
                value={form.caderaCm || ''}
                onChange={(e) => updateField('caderaCm', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-bg-elevated/40 border border-border/60 p-4 rounded-[var(--radius-lg)] space-y-3 mt-4">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <span>⚡</span> Composición Corporal / Bioimpedancia (Opcional)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Grasa Corporal (%)</label>
                <Input
                  type="number" step="0.1" placeholder="Ej: 24.5"
                  value={form.composicionCorporal?.porcentajeGrasa || ''}
                  onChange={(e) => updateComposicion('porcentajeGrasa', e.target.value ? Number(e.target.value) : '')}
                  rightElement="%"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Grasa Visceral (1-20)</label>
                <Input
                  type="number" placeholder="Ej: 8" min={1} max={20}
                  value={form.composicionCorporal?.grasaVisceral || ''}
                  onChange={(e) => updateComposicion('grasaVisceral', e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Músculo Esquelético (%)</label>
                <Input
                  type="number" step="0.1" placeholder="Ej: 32.0"
                  value={form.composicionCorporal?.musculoEsqueletico || ''}
                  onChange={(e) => updateComposicion('musculoEsqueletico', e.target.value ? Number(e.target.value) : '')}
                  rightElement="%"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Músculo (kg)</label>
                <Input
                  type="number" step="0.1" placeholder="Ej: 28.5"
                  value={form.composicionCorporal?.musculoEsqueleticoKg || ''}
                  onChange={(e) => updateComposicion('musculoEsqueleticoKg', e.target.value ? Number(e.target.value) : '')}
                  rightElement="kg"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Sección 2.5: Laboratorios y Resistencia a la Insulina */}
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-salud-red" />
              <h2 className="text-base font-bold text-text-primary">Sección 2.5: Laboratorios y Resistencia a la Insulina (Opcional)</h2>
            </div>
            {form.laboratorios?.homaIr && (
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-salud-red-soft text-salud-red border border-salud-red/30">
                HOMA-IR: {form.laboratorios.homaIr}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Glucosa en ayunas (mg/dL)
              </label>
              <Input
                type="number"
                placeholder="Ej: 95"
                value={form.laboratorios?.glucosa || ''}
                onChange={(e) => updateLaboratorio('glucosa', e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Insulina basal (µU/mL)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ej: 12.5"
                value={form.laboratorios?.insulina || ''}
                onChange={(e) => updateLaboratorio('insulina', e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Presión Arterial
              </label>
              <Input
                type="text"
                placeholder="Ej: 120/80"
                value={form.laboratorios?.presionArterial || ''}
                onChange={(e) => updateLaboratorio('presionArterial', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Perfil Lipídico / Colesterol
              </label>
              <Input
                type="text"
                placeholder="Ej: Colesterol Total 220, Triglicéridos 150"
                value={form.laboratorios?.perfilLipidico || ''}
                onChange={(e) => updateLaboratorio('perfilLipidico', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Sección 3: Clínico y Estilo de Vida */}
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <Target size={18} className="text-salud-green" />
            <h2 className="text-base font-bold text-text-primary">Sección 3: Ajuste de Plan Nutricional</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Nivel de Actividad Física *
              </label>
              <Select
                value={form.nivelActividad}
                onChange={(e) => updateField('nivelActividad', Number(e.target.value))}
              >
                <option value={1}>Sedentario (Poco o ningún ejercicio)</option>
                <option value={2}>Ligero (Ejercicio ligero 1-3 días/sem)</option>
                <option value={3}>Moderado (Ejercicio mod. 3-5 días/sem)</option>
                <option value={4}>Activo (Ejercicio fuerte 6-7 días/sem)</option>
                <option value={5}>Muy Activo (Atleta, trabajo físico)</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Objetivo Nutricional *
              </label>
              <div className="flex flex-wrap gap-2">
                {getOptionsByCategory('objetivo').map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      const current = form.objetivo || [];
                      if (current.includes(obj.valor)) {
                        updateField('objetivo', current.filter(o => o !== obj.valor));
                      } else {
                        updateField('objetivo', [...current, obj.valor]);
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-[var(--radius-sm)] border-2 transition-colors ${
                      form.objetivo?.includes(obj.valor)
                        ? 'border-salud-green bg-salud-green-soft text-salud-green'
                        : 'border-border bg-bg-primary text-text-secondary hover:border-salud-green/40'
                    }`}
                  >
                    {obj.valor}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="recalculate"
              checked={recalculateCalories}
              onChange={(e) => setRecalculateCalories(e.target.checked)}
              className="w-4 h-4 text-salud-green border-border rounded cursor-pointer"
            />
            <label htmlFor="recalculate" className="text-sm font-semibold text-text-primary cursor-pointer">
              Actualizar gasto calórico y generar nuevo plan nutricional
            </label>
          </div>
        </Card>

        {/* Sección 4: Notas del Profesional */}
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <FileText size={18} className="text-text-primary" />
            <h2 className="text-base font-bold text-text-primary">Sección 4: Notas y Adjuntos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-2">Notas Clínicas (Ocultas al paciente)</label>
              <Textarea
                value={form.notasProfesional || ''}
                onChange={(e) => updateField('notasProfesional', e.target.value)}
                placeholder="Observaciones clínicas, apego al tratamiento, cambios en medicación..."
                rows={5}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-salud-green mb-2">Indicaciones al Paciente (Visible en su app)</label>
              <Textarea
                value={form.indicacionesPaciente || ''}
                onChange={(e) => updateField('indicacionesPaciente', e.target.value)}
                placeholder="Escribe el feedback y las recomendaciones que quieres que lea el paciente..."
                rows={5}
                className="border-salud-green/40 focus:border-salud-green focus:ring-salud-green/20"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button variant="secondary" icon={<FileText size={16} />} size="sm">
              Adjuntar PDF de Laboratorios
            </Button>
            <span className="text-xs text-text-tertiary">Opcional</span>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-border/50 flex items-center justify-end gap-3 mt-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/staff/pacientes/${patient.id}`)}
        >
          Cancelar
        </Button>

        <Button
          disabled={isSubmitting}
          onClick={handleSubmit}
          icon={<CheckCircle2 size={18} />}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Evaluación'}
        </Button>
      </div>
    </div>
  );
}
