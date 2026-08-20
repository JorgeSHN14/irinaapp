import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, Edit, FileText, Activity, AlertTriangle,
  Calendar, Scale, Droplets, Target, User, HeartPulse, Pill, TrendingUp, Table,
  PlayCircle, Plus, Trash2, Video, Flame, UtensilsCrossed
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useStaff } from '../../contexts/StaffContext';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Tabs, { useTabs } from '../../components/ui/Tabs';
import SlideOver from '../../components/ui/SlideOver';
import type { Evaluacion } from '../../types/patients';

// =============================================
// Staff: Detalle de Paciente
// =============================================

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatientById, addPrescription, getPatientEvaluations, updatePatientRutina, updatePatientInfografias, deletePatient, dispatch } = useStaff();

  const patient = id ? getPatientById(id) : undefined;
  const evaluations = patient ? getPatientEvaluations(patient.id) : [];
  const latestLabs = evaluations[0]?.laboratorios || patient?.laboratorios;
  const latestComp = evaluations[0]?.composicionCorporal || patient?.composicionCorporal;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { activeTab, setActiveTab } = useTabs('plan');
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluacion | null>(null);

  const [newPrescription, setNewPrescription] = useState({
    medicamento: '',
    dosis: '',
    frecuencia: '',
    duracionDias: 30,
    indicaciones: ''
  });

  const [planForm, setPlanForm] = useState({
    get: 0,
    pctProteina: 30,
    pctGrasa: 25,
    pctCarbs: 45,
    metaHidratacionMl: 2000,
    alertaHidratacion: false,
  });
  const [planSaving, setPlanSaving] = useState(false);

  // Estado para el modal de rutina
  const [showRutinaModal, setShowRutinaModal] = useState(false);
  const [rutinaForm, setRutinaForm] = useState({
    videoUrl: '',
    items: [] as string[],
    newItem: '',
  });
  const [rutinaSaving, setRutinaSaving] = useState(false);

  // Estado para el modal de Infografías
  const [showInfografiasModal, setShowInfografiasModal] = useState(false);
  const [infografiasForm, setInfografiasForm] = useState({
    titulo: '',
    url: '',
    items: patient?.infografias || [],
  });
  const [infografiasSaving, setInfografiasSaving] = useState(false);

  // Actualizar items de infografías cuando cambia el paciente
  useEffect(() => {
    if (patient) {
      setInfografiasForm(f => ({ ...f, items: patient.infografias || [] }));
    }
  }, [patient?.infografias]);

  const [patientState, setPatientState] = useState<any>({ diario: {}, prescripciones: [] });

  useEffect(() => {
    if (!patient?.id) return;

    let channels: any[] = [];

    async function fetchPatientData() {
      if (!patient?.id) return;
      const [
        { data: logs },
        { data: prescriptions }
      ] = await Promise.all([
        supabase.from('patient_daily_logs').select('*').eq('patient_id', patient.id),
        supabase.from('patient_prescriptions').select('*').eq('patient_id', patient.id).eq('activa', true)
      ]);

      const diario: any = {};
      logs?.forEach((log: any) => {
        diario[log.fecha] = {
          fecha: log.fecha,
          hidratacionMl: log.hidratacion_ml,
          comidasRegistradas: log.comidas_registradas || {},
          habitos: log.habitos || {},
          adherenciaPrescripciones: log.adherencia_prescripciones || []
        };
      });

      const prescripciones = prescriptions?.map((p: any) => ({
        id: p.id,
        medicamento: p.medicamento,
        dosis: p.dosis,
        frecuencia: p.frecuencia,
        duracionDias: p.duracion_dias,
        indicaciones: p.indicaciones,
        fechaInicio: p.fecha_inicio,
        activa: p.activa
      })) || [];

      setPatientState({ diario, prescripciones });
    }

    fetchPatientData();

    const channel = supabase.channel(`staff-patient-${patient.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_daily_logs', filter: `patient_id=eq.${patient.id}` }, () => fetchPatientData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_prescriptions', filter: `patient_id=eq.${patient.id}` }, () => fetchPatientData())
      .subscribe();

    channels.push(channel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [patient?.id]);

  const prescripciones = patientState.prescripciones || [];

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
          description="El paciente que buscas no existe o ha sido eliminado del sistema."
          action={<Button onClick={() => navigate('/staff/pacientes')}>Ir al directorio</Button>}
        />
      </div>
    );
  }

  const getStatusBadge = (estatus: string) => {
    switch (estatus) {
      case 'activo': return <Badge variant="success" dot>Activo</Badge>;
      case 'inactivo': return <Badge variant="warning" dot>Inactivo</Badge>;
      case 'alta': return <Badge variant="info" dot>Alta</Badge>;
      default: return <Badge>{estatus}</Badge>;
    }
  };

  const hasCriticalConditions = patient.condiciones.some(c =>
    ['Diabetes 1', 'Diabetes 2', 'Hipertensión'].includes(c)
  );

  const getHistoricalData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fechaIso = d.toISOString().split('T')[0];
      const diaStr = d.toLocaleDateString('es-MX', { weekday: 'short' });

      const log = patientState?.diario?.[fechaIso];
      let adherencia = 0;

      if (log && log.adherenciaPrescripciones) {
        const total = patientState?.prescripciones?.length || 0;
        const tomadas = log.adherenciaPrescripciones.filter((p: any) => p.tomada).length;
        adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;
      }

      const glucosa = log?.habitos?.glucosaCapilar || 0;

      data.push({
        fecha: diaStr,
        fechaIso,
        adherencia,
        glucosa,
        dolor: log?.habitos?.nivelDolor || 0,
        hidratacion: log?.hidratacionMl || 0,
      });
    }
    return data;
  };

  const historicalData = patient ? getHistoricalData() : [];

  const recentAlerts = historicalData.filter(d => d.hidratacion < 1500 || d.adherencia < 50);
  const isHighRisk = recentAlerts.length >= 3;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Back Button */}
      <button
        onClick={() => navigate('/staff/pacientes')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft size={18} /> Volver al directorio
      </button>

      {/* Header Profile */}
      <Card padding="lg" className="border-t-4 border-t-salud-blue relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <User size={150} />
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex items-start gap-5">
            <Avatar nombre={patient.nombre} apellido={patient.apellido} role="paciente" size="xl" />
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-extrabold text-text-primary">
                    {patient.nombre} {patient.apellido || ''}
                  </h1>
                  {getStatusBadge(patient.estatus)}
                </div>
                <p className="text-sm text-text-secondary mt-0.5">{patient.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-text-tertiary">
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {patient.edad} años</span>
                <span className="flex items-center gap-1.5"><User size={14} /> {patient.sexo === 'hombre' ? 'Hombre' : 'Mujer'}</span>
                <span className="flex items-center gap-1.5"><Scale size={14} /> {patient.tallaCm} cm</span>
                {patient.tipoSangre && (
                  <span className="flex items-center gap-1.5"><Droplets size={14} /> {patient.tipoSangre}</span>
                )}
                {patient.telefono && (
                  <span className="flex items-center gap-1.5">📞 {patient.telefono}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="secondary"
              icon={<Trash2 size={16} />}
              className="md:flex-none justify-center text-salud-red hover:text-white hover:bg-salud-red hover:border-salud-red px-3"
              onClick={() => setShowDeleteModal(true)}
            >
              Eliminar
            </Button>
            <Button
              variant="secondary"
              icon={<Edit size={16} />}
              className="flex-1 md:flex-none justify-center"
              onClick={() => navigate(`/staff/pacientes/${patient.id}/editar`)}
            >
              Editar Datos
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/staff/pacientes/${patient.id}/evaluar`)}
              icon={<FileText size={16} />}
              className="flex-1 md:flex-none justify-center"
            >
              Nueva Evaluación
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Clinical Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Condiciones y Alertas */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <HeartPulse size={18} className="text-salud-red" />
              <h2 className="text-base font-bold text-text-primary">Perfil Clínico</h2>
            </div>

            {hasCriticalConditions && (
              <div className="bg-bg-elevated border border-border/40 rounded-[var(--radius-md)] p-3 mb-4 flex items-start gap-2">
                <AlertTriangle size={16} className="text-salud-red flex-shrink-0 mt-0.5" />
                <p className="text-xs text-salud-red font-semibold leading-tight">
                  Paciente de alto riesgo. Monitorear adherencia a dieta.
                </p>
              </div>
            )}

            {isHighRisk && (
              <div className="bg-bg-elevated border border-border/40 rounded-[var(--radius-md)] p-3 mb-4 flex items-start gap-2 animate-pulse-soft">
                <AlertTriangle size={16} className="text-salud-amber flex-shrink-0 mt-0.5" />
                <p className="text-xs text-salud-amber font-semibold leading-tight">
                  Alerta Preventiva: Bajo consumo de agua o baja adherencia recurrente (últimos 3 días).
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider mb-2">Condiciones Médicas</p>
                {patient.condiciones.length > 0 && !patient.condiciones.includes('ninguno') ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patient.condiciones.map(c => (
                      <span key={c} className="text-xs font-bold text-salud-amber bg-salud-amber-soft/40 px-2 py-1 rounded-md border border-salud-amber/20">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-text-secondary">Sin condiciones reportadas</span>
                )}
              </div>

              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider mb-2">Alergias / Restricciones</p>
                {patient.alergias && patient.alergias.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patient.alergias.map((a: string) => (
                      <span key={a} className="text-xs font-bold text-salud-red bg-salud-red-soft/40 px-2 py-1 rounded-md border border-salud-red/20">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-text-secondary">Sin alergias registradas</span>
                )}
              </div>
            </div>
          </Card>

          {/* Antropometría (Última Eval) */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-salud-blue" />
                <h2 className="text-base font-bold text-text-primary">Últimas Medidas</h2>
              </div>
              <span className="text-xs text-text-tertiary">
                {patient.ultimaEvaluacion ? new Date(patient.ultimaEvaluacion).toLocaleDateString() : 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-elevated p-3 rounded-[var(--radius-md)]">
                <p className="text-xs text-text-secondary mb-1">Peso</p>
                <p className="text-lg font-bold text-text-primary">{patient.pesoKg} <span className="text-sm font-normal text-text-tertiary">kg</span></p>
              </div>
              <div className="bg-bg-elevated p-3 rounded-[var(--radius-md)]">
                <p className="text-xs text-text-secondary mb-1">Cintura</p>
                <p className="text-lg font-bold text-text-primary">{patient.cinturaCm} <span className="text-sm font-normal text-text-tertiary">cm</span></p>
              </div>
              <div className="bg-bg-elevated p-3 rounded-[var(--radius-md)]">
                <p className="text-xs text-text-secondary mb-1">IMC</p>
                <p className="text-lg font-bold text-salud-blue">{patient.resultadosActuales?.imc.toFixed(1) || '—'}</p>
              </div>
              <div className="bg-bg-elevated p-3 rounded-[var(--radius-md)]">
                <p className="text-xs text-text-secondary mb-1">Cadera</p>
                <p className="text-lg font-bold text-text-primary">{patient.caderaCm} <span className="text-sm font-normal text-text-tertiary">cm</span></p>
              </div>
            </div>
          </Card>

          {/* Laboratorios y HOMA-IR */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-salud-red" />
                <h2 className="text-base font-bold text-text-primary">Laboratorios / HOMA-IR</h2>
              </div>
              {latestLabs?.homaIr && (
                <Badge variant="warning" dot>
                  HOMA-IR: {latestLabs.homaIr}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)]">
                <span className="text-text-secondary block">Glucosa Ayunas</span>
                <strong className="text-sm text-text-primary">
                  {latestLabs?.glucosa ? `${latestLabs.glucosa} mg/dL` : '—'}
                </strong>
              </div>
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)]">
                <span className="text-text-secondary block">Insulina Basal</span>
                <strong className="text-sm text-text-primary">
                  {latestLabs?.insulina ? `${latestLabs.insulina} µU/mL` : '—'}
                </strong>
              </div>
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)] col-span-2 flex justify-between">
                <span className="text-text-secondary">PA: <strong className="text-text-primary">{latestLabs?.presionArterial || '—'}</strong></span>
                <span className="text-text-secondary">Lip: <strong className="text-text-primary">{latestLabs?.perfilLipidico || '—'}</strong></span>
              </div>
            </div>
          </Card>

          {/* Composición Corporal (Bioimpedancia) */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">⚡</span>
              <h2 className="text-base font-bold text-text-primary">Composición Corporal</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)]">
                <span className="text-text-secondary block">Grasa Corporal</span>
                <strong className="text-sm text-text-primary">
                  {latestComp?.porcentajeGrasa ? `${latestComp.porcentajeGrasa}%` : '—'}
                </strong>
              </div>
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)]">
                <span className="text-text-secondary block">Grasa Visceral</span>
                <strong className="text-sm text-salud-amber">
                  {latestComp?.grasaVisceral ? `Nivel ${latestComp.grasaVisceral}` : '—'}
                </strong>
              </div>
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)]">
                <span className="text-text-secondary block">Músculo Esquelético</span>
                <strong className="text-sm text-salud-green">
                  {latestComp?.musculoEsqueletico ? `${latestComp.musculoEsqueletico}%` : '—'}
                </strong>
              </div>
              <div className="bg-bg-elevated p-2.5 rounded-[var(--radius-md)]">
                <span className="text-text-secondary block">Músculo (kg)</span>
                <strong className="text-sm text-text-primary">
                  {latestComp?.musculoEsqueleticoKg ? `${latestComp.musculoEsqueleticoKg} kg` : '—'}
                </strong>
              </div>
            </div>
          </Card>

          {/* Prescripciones Médicas */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-salud-purple" />
                <h2 className="text-base font-bold text-text-primary">Prescripciones</h2>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
                Añadir
              </Button>
            </div>

            <div className="space-y-3">
              {prescripciones.length > 0 ? (
                prescripciones.map((p: any) => (
                  <div key={p.id} className="p-3 border border-border/40 rounded-[var(--radius-md)] bg-bg-elevated/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-salud-purple flex items-center gap-1.5">
                          💊 {p.medicamento}
                        </p>
                        <p className="text-xs text-text-primary font-medium mt-1">{p.dosis} • {p.frecuencia}</p>
                        <p className="text-[11px] text-text-secondary mt-0.5">{p.indicaciones}</p>
                      </div>
                      <Badge variant={p.activa ? 'success' : 'default'} dot>{p.activa ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-text-tertiary">No hay medicamentos prescritos.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Diet and Tracking */}
        <div className="space-y-6 lg:col-span-2">

          {/* Tabs Navigation */}
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'plan', label: 'Plan Actual', icon: <Target size={16} /> },
              { id: 'nutricion', label: 'Nutrición', icon: <Flame size={16} /> },
              { id: 'evolucion', label: 'Evolución', icon: <TrendingUp size={16} /> },
              { id: 'historial', label: 'Historial Clínico', icon: <Activity size={16} />, badge: evaluations.length }
            ]}
          />

          {/* TAB 1: PLAN ACTUAL */}
          {activeTab === 'plan' && (
            <Card padding="lg" className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Target size={20} className="text-salud-green" />
                  <h2 className="text-lg font-bold text-text-primary">Plan Nutricional Activo</h2>
                </div>
                <Badge variant="success">Dieta Asignada</Badge>
              </div>

              {patient.resultadosActuales ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-bg-elevated border border-border/40 p-4 rounded-[var(--radius-lg)]">
                    <div>
                      <p className="text-sm font-bold text-salud-green uppercase tracking-wide mb-1">Objetivo Metabólico</p>
                      <p className="text-2xl font-extrabold text-text-primary">{patient.resultadosActuales.get.toFixed(0)} kcal / día</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (patient.resultadosActuales) {
                          const r = patient.resultadosActuales;
                          const totalKcal = r.get;
                          const pctProt = Math.round((r.macros.proteinas.kcal / totalKcal) * 100);
                          const pctGrasa = Math.round((r.macros.grasas.kcal / totalKcal) * 100);
                          const pctCarbs = Math.round((r.macros.carbohidratos.kcal / totalKcal) * 100);
                          setPlanForm({
                            get: Math.round(r.get),
                            pctProteina: pctProt,
                            pctGrasa: pctGrasa,
                            pctCarbs: pctCarbs,
                            metaHidratacionMl: r.metaHidratacionMl,
                            alertaHidratacion: r.alertaHidratacion,
                          });
                        }
                        setShowPlanModal(true);
                      }}
                    >
                      Modificar Plan
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 border border-border/60 rounded-[var(--radius-md)] text-center">
                      <p className="text-lg font-bold text-salud-blue">{Math.round(patient.resultadosActuales.macros.proteinas.gramos)}g</p>
                      <p className="text-xs font-semibold text-text-secondary mt-0.5">Proteína ({Math.round(patient.resultadosActuales.macros.proteinas.porcentaje)}%)</p>
                    </div>
                    <div className="p-3 border border-border/60 rounded-[var(--radius-md)] text-center">
                      <p className="text-lg font-bold text-salud-amber">{Math.round(patient.resultadosActuales.macros.carbohidratos.gramos)}g</p>
                      <p className="text-xs font-semibold text-text-secondary mt-0.5">Carbohidratos ({Math.round(patient.resultadosActuales.macros.carbohidratos.porcentaje)}%)</p>
                    </div>
                    <div className="p-3 border border-border/60 rounded-[var(--radius-md)] text-center">
                      <p className="text-lg font-bold text-text-primary">{Math.round(patient.resultadosActuales.macros.grasas.gramos)}g</p>
                      <p className="text-xs font-semibold text-text-secondary mt-0.5">Grasas ({Math.round(patient.resultadosActuales.macros.grasas.porcentaje)}%)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-[var(--radius-md)]">
                    <Droplets size={20} className="text-salud-blue" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">Meta de Hidratación: {patient.resultadosActuales.metaHidratacionMl} ml/día</p>
                      {patient.resultadosActuales.alertaHidratacion && (
                        <p className="text-xs text-salud-amber font-semibold mt-0.5">Alerta de restricción hídrica activada</p>
                      )}
                    </div>
                  </div>

                  {/* ── Rutina de Rehabilitación ── */}
                  <div className="pt-4 border-t border-border/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PlayCircle size={18} className="text-salud-purple" />
                        <h3 className="text-sm font-bold text-text-primary">Rutina de Rehabilitación</h3>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRutinaForm({
                            videoUrl: patient.rutinaVideoUrl || '',
                            items: patient.rutinaItems ? [...patient.rutinaItems] : [],
                            newItem: '',
                          });
                          setShowRutinaModal(true);
                        }}
                      >
                        {patient.rutinaVideoUrl || (patient.rutinaItems && patient.rutinaItems.length > 0)
                          ? 'Editar Rutina'
                          : 'Asignar Rutina'}
                      </Button>
                    </div>

                    {patient.rutinaVideoUrl || (patient.rutinaItems && patient.rutinaItems.length > 0) ? (
                      <div className="space-y-2">
                        {/* Items */}
                        {patient.rutinaItems && patient.rutinaItems.length > 0 && (
                          <ul className="space-y-1.5">
                            {patient.rutinaItems.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                                <span className="mt-0.5 w-4 h-4 rounded-full bg-salud-purple/10 text-salud-purple flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                                  {i + 1}
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Video URL */}
                        {patient.rutinaVideoUrl && (
                          <a
                            href={patient.rutinaVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-salud-blue font-semibold hover:underline mt-1"
                          >
                            <Video size={13} />
                            Ver video asignado
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary italic">Sin rutina asignada. Usa el botón para agregar una.</p>
                    )}
                  </div>

                  {/* ── Infografías Médicas ── */}
                  <div className="pt-4 border-t border-border/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-salud-green" />
                        <h3 className="text-sm font-bold text-text-primary">Infografías Médicas</h3>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setInfografiasForm({
                            titulo: '',
                            url: '',
                            items: patient.infografias || [],
                          });
                          setShowInfografiasModal(true);
                        }}
                      >
                        {patient.infografias && patient.infografias.length > 0
                          ? 'Editar Infografías'
                          : 'Añadir Infografías'}
                      </Button>
                    </div>

                    {patient.infografias && patient.infografias.length > 0 ? (
                      <div className="space-y-2">
                        <ul className="space-y-1.5">
                          {patient.infografias.map((info) => (
                            <li key={info.id} className="flex items-start gap-2 text-xs text-text-secondary">
                              <span className="mt-0.5 w-4 h-4 rounded-full bg-salud-green/10 text-salud-green flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                                <FileText size={10} />
                              </span>
                              <a href={info.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-text-primary font-medium">
                                {info.titulo}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary italic">Sin infografías asignadas. Usa el botón para agregar una.</p>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Sin plan nutricional"
                  description="Realiza una evaluación para generar los cálculos metabólicos del paciente."
                  action={<Button icon={<FileText size={16} />} size="sm" onClick={() => navigate(`/staff/pacientes/${patient.id}/evaluar`)}>Crear Evaluación</Button>}
                />
              )}
            </Card>
          )}

          {/* TAB NUTRICIÓN */}
          {activeTab === 'nutricion' && (() => {
            const objetivoKcal = patient.resultadosActuales?.get || 0;
            const margenKcal = objetivoKcal * 0.05;

            // Datos de los últimos 7 días para este paciente
            const nutricionData = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dateStr = d.toISOString().split('T')[0];
              const diaStr = d.toLocaleDateString('es-MX', { weekday: 'short' });
              const log = patientState?.diario?.[dateStr];
              const kcal = log?.comidasRegistradas
                ? Object.values(log.comidasRegistradas as Record<string, any>).reduce((acc: number, c: any) => acc + (c.kcalConsumidas || 0), 0)
                : 0;
              const comidas = log?.comidasRegistradas ? Object.keys(log.comidasRegistradas).length : 0;
              const dentroObjetivo = kcal > 0 && kcal >= objetivoKcal - margenKcal && kcal <= objetivoKcal + margenKcal;
              const excede = kcal > objetivoKcal + margenKcal;
              return { fecha: dateStr, dia: diaStr.charAt(0).toUpperCase() + diaStr.slice(1), kcal, comidas, dentroObjetivo, excede, log };
            });

            const diasConRegistro = nutricionData.filter(d => d.kcal > 0);
            const diasEnObjetivo = nutricionData.filter(d => d.dentroObjetivo).length;
            const adherenciaPct = diasConRegistro.length > 0 ? Math.round((diasEnObjetivo / diasConRegistro.length) * 100) : 0;

            return (
              <div className="space-y-4 animate-fade-in">
                {/* Resumen rápido */}
                {!patient.resultadosActuales && (
                  <EmptyState
                    title="Sin plan nutricional activo"
                    description="Este paciente aún no tiene un plan calórico asignado. Realiza una evaluación primero."
                    action={<Button size="sm" icon={<FileText size={16} />} onClick={() => navigate(`/staff/pacientes/${patient.id}/evaluar`)}>Crear Evaluación</Button>}
                  />
                )}

                {patient.resultadosActuales && (
                  <>
                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                      <Card padding="sm" className="text-center">
                        <p className="text-xs text-text-secondary mb-1">Objetivo Diario</p>
                        <p className="text-lg font-extrabold text-salud-blue">{Math.round(objetivoKcal)}</p>
                        <p className="text-xs text-text-tertiary">kcal / día</p>
                      </Card>
                      <Card padding="sm" className="text-center">
                        <p className="text-xs text-text-secondary mb-1">Adherencia</p>
                        <p className={`text-lg font-extrabold ${adherenciaPct >= 80 ? 'text-salud-green' : adherenciaPct >= 50 ? 'text-salud-amber' : 'text-salud-red'}`}>
                          {diasConRegistro.length > 0 ? `${adherenciaPct}%` : '—'}
                        </p>
                        <p className="text-xs text-text-tertiary">calórica 7 días</p>
                      </Card>
                      <Card padding="sm" className="text-center">
                        <p className="text-xs text-text-secondary mb-1">Días en objetivo</p>
                        <p className="text-lg font-extrabold text-text-primary">{diasEnObjetivo} / 7</p>
                        <p className="text-xs text-text-tertiary">±5% margen</p>
                      </Card>
                    </div>

                    {/* Gráfico de consumo calórico */}
                    <Card padding="md">
                      <div className="flex items-center gap-2 mb-4">
                        <Flame size={16} className="text-salud-amber" />
                        <h3 className="font-bold text-text-primary text-sm">Consumo Calórico vs Objetivo (7 días)</h3>
                      </div>
                      <div className="h-[200px] -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={nutricionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="dia" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                            <RechartsTooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '12px' }}
                              formatter={(val: any) => [`${Math.round(val)} kcal`, 'Consumido']}
                            />
                            {objetivoKcal > 0 && (
                              <ReferenceLine y={objetivoKcal} stroke="#2563EB" strokeDasharray="5 3" strokeWidth={2}
                                label={{ value: 'Objetivo', position: 'insideTopRight', fontSize: 10, fill: '#2563EB', fontWeight: 700 }}
                              />
                            )}
                            {objetivoKcal > 0 && <ReferenceLine y={objetivoKcal + margenKcal} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1} />}
                            {objetivoKcal > 0 && <ReferenceLine y={Math.max(0, objetivoKcal - margenKcal)} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1} />}
                            <Bar dataKey="kcal" radius={[5, 5, 0, 0]} maxBarSize={36}>
                              {nutricionData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.kcal === 0 ? '#E5E7EB' : entry.excede ? '#EF4444' : entry.dentroObjetivo ? '#10B981' : '#3B82F6'}
                                  fillOpacity={entry.kcal === 0 ? 0.4 : 0.85}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-text-tertiary font-semibold">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-salud-green inline-block" />En objetivo (±5%)</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-salud-blue inline-block" />Por debajo</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-salud-red inline-block" />Excede</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-border inline-block opacity-60" />Sin registro</span>
                      </div>
                    </Card>

                    {/* Detalle diario */}
                    <Card padding="md">
                      <div className="flex items-center gap-2 mb-3">
                        <UtensilsCrossed size={16} className="text-salud-green" />
                        <h3 className="font-bold text-text-primary text-sm">Detalle Diario de Comidas</h3>
                      </div>
                      <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                        {[...nutricionData].reverse().map(d => {
                          if (d.comidas === 0 && d.kcal === 0) return (
                            <div key={d.fecha} className="flex items-center justify-between py-2 px-3 rounded-xl bg-bg-elevated/40 border border-border/30">
                              <span className="text-xs font-semibold text-text-tertiary capitalize">{d.dia} {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                              <Badge>Sin registro</Badge>
                            </div>
                          );
                          const log = patientState?.diario?.[d.fecha];
                          const comidaEntries = log?.comidasRegistradas ? Object.values(log.comidasRegistradas as Record<string, any>) : [];
                          return (
                            <div key={d.fecha} className="rounded-xl border border-border/40 bg-bg-elevated/50 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-text-primary capitalize">{d.dia} {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                                <div className="flex items-center gap-2">
                                  {d.kcal > 0 && (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      d.dentroObjetivo ? 'bg-salud-green-soft/30 text-salud-green' :
                                      d.excede ? 'bg-salud-red-soft/30 text-salud-red' :
                                      'bg-salud-blue-soft/20 text-salud-blue'
                                    }`}>
                                      {Math.round(d.kcal)} kcal
                                    </span>
                                  )}
                                  <span className="text-[11px] text-text-tertiary">{d.comidas} comida{d.comidas !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {comidaEntries.map((comida: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-salud-green" />
                                      <span className="font-semibold text-text-secondary">{comida.nombreComida}</span>
                                      {comida.recetaSeleccionadaNombre && (
                                        <span className="text-text-tertiary">· {comida.recetaSeleccionadaNombre}</span>
                                      )}
                                    </div>
                                    {comida.kcalConsumidas > 0 && (
                                      <span className="font-bold text-text-secondary">{Math.round(comida.kcalConsumidas)} kcal</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 2: EVOLUCION */}
          {activeTab === 'evolucion' && (
            <Card padding="md" className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-salud-green" />
                  <h2 className="text-base font-bold text-text-primary">Correlación (7 días)</h2>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowReport(true)} icon={<Table size={16} />}>
                  Reporte
                </Button>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} domain={[0, 100]} />
                    {(patient.condiciones.includes('Diabetes 1') || patient.condiciones.includes('Diabetes 2')) && (
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    )}
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="adherencia" name="Adherencia %" stroke="#0D9488" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    {(patient.condiciones.includes('Diabetes 1') || patient.condiciones.includes('Diabetes 2')) && (
                      <Line yAxisId="right" type="monotone" dataKey="glucosa" name="Glucosa" stroke="#E11D48" strokeWidth={3} dot={{ r: 4 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* TAB 3: HISTORIAL CLINICO */}
          {activeTab === 'historial' && (
            <Card padding="md" className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-salud-blue" />
                  <h2 className="text-base font-bold text-text-primary">Evaluaciones Realizadas</h2>
                </div>
              </div>

              {evaluations.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {evaluations.map((evaluacion, index) => {
                    // Calcular comparativa de peso con la anterior (que en el array invertido es index+1)
                    const prevEval = index < evaluations.length - 1 ? evaluations[index + 1] : null;
                    const diffPeso = prevEval ? (evaluacion.pesoKg - prevEval.pesoKg).toFixed(1) : null;
                    const isDiffPositive = diffPeso && Number(diffPeso) > 0;

                    return (
                      <div
                        key={evaluacion.id}
                        onClick={() => setSelectedEvaluation(evaluacion)}
                        className="flex items-center justify-between p-3 border border-border/40 rounded-[var(--radius-md)] hover:border-salud-blue/30 hover:bg-bg-elevated transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-salud-blue-soft flex items-center justify-center text-salud-blue flex-shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary group-hover:text-salud-blue transition-colors">
                              {index === evaluations.length - 1 ? 'Evaluación Inicial' : `Seguimiento #${evaluations.length - index}`}
                            </p>
                            <p className="text-xs text-text-tertiary">{new Date(evaluacion.fecha).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {diffPeso && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDiffPositive ? 'bg-salud-amber-soft text-salud-amber' : 'bg-salud-green-soft text-salud-green'}`}>
                              {isDiffPositive ? '+' : ''}{diffPeso} kg
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{evaluacion.pesoKg} kg</p>
                            <p className="text-xs text-text-tertiary">IMC {evaluacion.resultados?.imc?.toFixed(1) || '—'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-text-tertiary">No hay evaluaciones previas.</p>
                </div>
              )}
            </Card>
          )}
        </div>

      </div>

      {/* Modal Nueva Prescripción */}
      {
        isModalOpen && (
          <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border/60 rounded-[var(--radius-lg)] shadow-xl w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up">
              <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Pill size={18} className="text-salud-purple" /> Nueva Prescripción
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-text-tertiary hover:text-text-primary">
                  &times;
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Medicamento</label>
                  <Input
                    type="text" placeholder="Ej. Metformina"
                    value={newPrescription.medicamento}
                    onChange={e => setNewPrescription(p => ({ ...p, medicamento: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Dosis</label>
                    <Input
                      type="text" placeholder="Ej. 500mg"
                      value={newPrescription.dosis}
                      onChange={e => setNewPrescription(p => ({ ...p, dosis: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Duración (días)</label>
                    <Input
                      type="number" placeholder="30"
                      value={newPrescription.duracionDias}
                      onChange={e => setNewPrescription(p => ({ ...p, duracionDias: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Frecuencia</label>
                  <Input
                    type="text" placeholder="Ej. 1 tableta cada 8 horas"
                    value={newPrescription.frecuencia}
                    onChange={e => setNewPrescription(p => ({ ...p, frecuencia: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">Indicaciones (opcional)</label>
                  <Textarea
                    placeholder="Ej. Tomar después del desayuno"
                    value={newPrescription.indicaciones}
                    onChange={e => setNewPrescription(p => ({ ...p, indicaciones: e.target.value }))}
                  />
                </div>
              </div>
              <div className="p-4 border-t border-border/60 bg-bg-elevated/30 flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={() => {
                  if (!newPrescription.medicamento || !newPrescription.dosis || !newPrescription.frecuencia) {
                    alert('Completa medicamento, dosis y frecuencia');
                    return;
                  }
                  addPrescription(patient.id, newPrescription);
                  setIsModalOpen(false);
                  setNewPrescription({ medicamento: '', dosis: '', frecuencia: '', duracionDias: 30, indicaciones: '' });
                }}>Guardar Prescripción</Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal Reporte Consolidado */}
      {
        showReport && (
          <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border/60 rounded-[var(--radius-lg)] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
              <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Table size={18} className="text-salud-blue" /> Reporte Consolidado (Últimos 7 días)
                </h3>
                <button onClick={() => setShowReport(false)} className="text-text-tertiary hover:text-text-primary">
                  &times;
                </button>
              </div>
              <div className="p-0 overflow-y-auto flex-1">
                <table className="w-full text-left text-sm text-text-secondary">
                  <thead className="bg-bg-elevated/50 text-xs uppercase font-bold text-text-tertiary">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Adherencia</th>
                      <th className="px-4 py-3">Agua (ml)</th>
                      <th className="px-4 py-3">Dolor</th>
                      <th className="px-4 py-3">Glucosa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {historicalData.map((d, idx) => (
                      <tr key={idx} className="hover:bg-bg-elevated/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-text-primary capitalize">{d.fecha}</td>
                        <td className="px-4 py-3">
                          <Badge variant={d.adherencia >= 80 ? 'success' : d.adherencia >= 50 ? 'warning' : 'danger'}>
                            {d.adherencia}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{d.hidratacion} ml</td>
                        <td className="px-4 py-3">{d.dolor} / 5</td>
                        <td className="px-4 py-3">{d.glucosa ? `${d.glucosa} mg/dL` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border/60 bg-bg-elevated/30 flex justify-end">
                <Button variant="primary" size="sm" onClick={() => setShowReport(false)}>Cerrar Reporte</Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal Modificar Plan Nutricional */}
      {
        showPlanModal && patient?.resultadosActuales && (
          <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border/60 rounded-[var(--radius-lg)] shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up">
              {/* Header */}
              <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Target size={18} className="text-salud-green" />
                  Modificar Plan Nutricional
                </h3>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* GET */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">
                    Objetivo Calórico (GET)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={800}
                      max={5000}
                      value={planForm.get}
                      onChange={e => setPlanForm(f => ({ ...f, get: Number(e.target.value) }))}
                      rightElement={<span className="text-xs text-text-tertiary">kcal/día</span>}
                    />
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">Rango recomendado: 1000 – 4000 kcal/día</p>
                </div>

                {/* Macros */}
                <div>
                  <p className="text-sm font-semibold text-text-secondary mb-3">Distribución de Macronutrientes</p>
                  <div className="space-y-3">
                    {/* Proteína */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-salud-blue w-24 shrink-0">Proteína (g)</span>
                      <input
                        type="number" min={0} step={1}
                        value={Math.round((planForm.get * planForm.pctProteina / 100) / 4)}
                        onChange={e => {
                          const g = Number(e.target.value);
                          const pct = planForm.get > 0 ? (g * 4 / planForm.get) * 100 : 0;
                          const remaining = 100 - pct - planForm.pctGrasa;
                          setPlanForm(f => ({ ...f, pctProteina: pct, pctCarbs: remaining }));
                        }}
                        className="flex-1 max-w-[140px] bg-bg-elevated border border-border/60 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold text-text-primary outline-none focus:border-salud-blue transition-colors"
                      />
                      <div className="flex-1" />
                      <span className="text-sm font-bold text-salud-blue w-16 text-right">
                        {Math.round(planForm.pctProteina)}%
                      </span>
                    </div>
                    {/* Grasas */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-text-primary w-24 shrink-0">Grasas (g)</span>
                      <input
                        type="number" min={0} step={1}
                        value={Math.round((planForm.get * planForm.pctGrasa / 100) / 9)}
                        onChange={e => {
                          const g = Number(e.target.value);
                          const pct = planForm.get > 0 ? (g * 9 / planForm.get) * 100 : 0;
                          const remaining = 100 - pct - planForm.pctProteina;
                          setPlanForm(f => ({ ...f, pctGrasa: pct, pctCarbs: remaining }));
                        }}
                        className="flex-1 max-w-[140px] bg-bg-elevated border border-border/60 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold text-text-primary outline-none focus:border-salud-blue transition-colors"
                      />
                      <div className="flex-1" />
                      <span className="text-sm font-bold text-text-primary w-16 text-right">
                        {Math.round(planForm.pctGrasa)}%
                      </span>
                    </div>
                    {/* Carbohidratos (calculado) */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-salud-amber w-24 shrink-0">Carbohidratos (g)</span>
                      <div className="flex-1 h-[8px] bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-salud-amber/60 rounded-full transition-all"
                          style={{ width: `${Math.max(0, planForm.pctCarbs)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-salud-amber w-16 text-right">
                        {Math.round((planForm.get * Math.max(0, planForm.pctCarbs) / 100) / 4)}g
                      </span>
                      <span className="text-xs text-text-tertiary w-16 text-right">
                        {Math.round(Math.max(0, planForm.pctCarbs))}%
                      </span>
                    </div>
                  </div>
                  {/* Total visual */}
                  <div className={`mt-3 text-xs font-bold text-right ${Math.abs(planForm.pctProteina + planForm.pctGrasa + Math.max(0, planForm.pctCarbs) - 100) < 0.5
                      ? 'text-salud-green' : 'text-salud-red'
                    }`}>
                    Total: {Math.round(planForm.pctProteina + planForm.pctGrasa + Math.max(0, planForm.pctCarbs))}%
                    {Math.abs(planForm.pctProteina + planForm.pctGrasa + Math.max(0, planForm.pctCarbs) - 100) > 0.5 && ' — debe sumar 100%'}
                  </div>
                </div>

                {/* Hidratación */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">
                    Meta de Hidratación
                  </label>
                  <Input
                    type="number"
                    min={500}
                    max={5000}
                    step={50}
                    value={planForm.metaHidratacionMl}
                    onChange={e => setPlanForm(f => ({ ...f, metaHidratacionMl: Number(e.target.value) }))}
                    rightElement={<span className="text-xs text-text-tertiary">ml/día</span>}
                  />
                </div>

                {/* Alerta Hidratación */}
                <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-[var(--radius-md)] border border-border/40">
                  <button
                    type="button"
                    onClick={() => setPlanForm(f => ({ ...f, alertaHidratacion: !f.alertaHidratacion }))}
                    className={`w-10 h-5 rounded-full transition-colors shrink-0 relative ${planForm.alertaHidratacion ? 'bg-salud-amber' : 'bg-border'
                      }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${planForm.alertaHidratacion ? 'left-5' : 'left-0.5'
                      }`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Alerta de restricción hídrica</p>
                    <p className="text-xs text-text-tertiary">Activa si el paciente tiene Hipertensión u otras condiciones</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/60 bg-bg-elevated/30 flex items-center justify-between gap-3">
                <p className="text-xs text-text-tertiary">
                  Los cambios se aplican de inmediato al perfil del paciente.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowPlanModal(false)}>Cancelar</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={planSaving ||
                      planForm.pctProteina + planForm.pctGrasa + Math.max(0, planForm.pctCarbs) !== 100 ||
                      planForm.get < 800
                    }
                    onClick={async () => {
                      setPlanSaving(true);
                      try {
                        const { get: targetGet, pctProteina, pctGrasa, metaHidratacionMl, alertaHidratacion } = planForm;
                        const pctCarbs = Math.max(0, 100 - pctProteina - pctGrasa);

                        const kcalProt = targetGet * (pctProteina / 100);
                        const kcalGrasa = targetGet * (pctGrasa / 100);
                        const kcalCHO = targetGet * (pctCarbs / 100);

                        const updatedResultados = {
                          ...patient.resultadosActuales!,
                          get: targetGet,
                          metaHidratacionMl,
                          alertaHidratacion,
                          macros: {
                            proteinas: {
                              gramos: kcalProt / 4,
                              kcal: kcalProt,
                              porcentaje: pctProteina,
                              kcalPorGramo: 4,
                            },
                            grasas: {
                              gramos: kcalGrasa / 9,
                              kcal: kcalGrasa,
                              porcentaje: pctGrasa,
                              kcalPorGramo: 9,
                            },
                            carbohidratos: {
                              gramos: kcalCHO / 4,
                              kcal: kcalCHO,
                              porcentaje: pctCarbs,
                              kcalPorGramo: 4,
                            },
                            totalKcal: targetGet,
                          },
                        };

                        const { error } = await supabase
                          .from('patients')
                          .update({ resultados_actuales: updatedResultados, updated_at: new Date().toISOString() })
                          .eq('id', patient.id);

                        if (error) throw error;

                        dispatch({ type: 'UPDATE_PATIENT', payload: { ...patient, resultadosActuales: updatedResultados } });
                        setShowPlanModal(false);
                      } catch (err) {
                        console.error('Error actualizando plan:', err);
                        alert('Error al guardar el plan. Intenta de nuevo.');
                      } finally {
                        setPlanSaving(false);
                      }
                    }}
                  >
                    {planSaving ? 'Guardando…' : 'Guardar Plan'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ── Modal Rutina de Rehabilitación ── */}
      {
        showRutinaModal && (
          <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border/60 rounded-[var(--radius-lg)] shadow-xl w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up">
              {/* Header */}
              <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <PlayCircle size={18} className="text-salud-purple" />
                  Rutina de Rehabilitación
                </h3>
                <button
                  onClick={() => {
                    setShowRutinaModal(false);
                    setRutinaSaving(false);
                  }}
                  className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* URL de YouTube */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                    <Video size={14} /> Link de video (YouTube u otro)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={rutinaForm.videoUrl}
                    onChange={e => setRutinaForm(f => ({ ...f, videoUrl: e.target.value }))}
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    El paciente verá un botón "Ver Guía en Video" que abrirá este enlace.
                  </p>
                </div>

                {/* Lista de ítems */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Pasos / Ejercicios de la rutina
                  </label>

                  {rutinaForm.items.length > 0 && (
                    <ul className="space-y-2 mb-3">
                      {rutinaForm.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 bg-bg-elevated rounded-[var(--radius-md)] px-3 py-2 border border-border/40">
                          <span className="w-5 h-5 rounded-full bg-salud-purple/10 text-salud-purple flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-text-primary">{item}</span>
                          <button
                            onClick={() => setRutinaForm(f => ({
                              ...f,
                              items: f.items.filter((_, idx) => idx !== i)
                            }))}
                            className="text-text-tertiary hover:text-salud-red transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Agregar nuevo ítem */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ej: 10 sentadillas lentas con apoyo"
                      value={rutinaForm.newItem}
                      onChange={e => setRutinaForm(f => ({ ...f, newItem: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && rutinaForm.newItem.trim()) {
                          e.preventDefault();
                          setRutinaForm(f => ({
                            ...f,
                            items: [...f.items, f.newItem.trim()],
                            newItem: '',
                          }));
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!rutinaForm.newItem.trim()) return;
                        setRutinaForm(f => ({
                          ...f,
                          items: [...f.items, f.newItem.trim()],
                          newItem: '',
                        }));
                      }}
                      className="p-2 rounded-[var(--radius-md)] bg-salud-purple/10 text-salud-purple hover:bg-salud-purple/20 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">
                    Presiona Enter o el botón + para agregar cada paso.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/60 bg-bg-elevated/30 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={rutinaSaving}
                  onClick={async () => {
                    setRutinaSaving(true);
                    try {
                      await updatePatientRutina(patient.id, { videoUrl: undefined, items: undefined });
                      setShowRutinaModal(false);
                    } catch (err) {
                      console.error('Error quitando rutina:', err);
                      alert('Error al quitar la rutina. Intenta de nuevo.');
                    } finally {
                      setRutinaSaving(false);
                    }
                  }}
                  className="text-salud-red hover:text-salud-red"
                >
                  {rutinaSaving ? '...' : 'Quitar rutina'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRutinaModal(false);
                      setRutinaSaving(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={rutinaSaving || (!rutinaForm.videoUrl && rutinaForm.items.length === 0)}
                    onClick={async () => {
                      setRutinaSaving(true);
                      try {
                        await updatePatientRutina(patient.id, {
                          videoUrl: rutinaForm.videoUrl || undefined,
                          items: rutinaForm.items.length > 0 ? rutinaForm.items : undefined,
                        });
                        setShowRutinaModal(false);
                      } catch (err) {
                        console.error('Error guardando rutina:', err);
                        alert('Error al guardar la rutina. Intenta de nuevo.');
                      } finally {
                        setRutinaSaving(false);
                      }
                    }}
                  >
                    {rutinaSaving ? 'Guardando…' : 'Guardar Rutina'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ── Modal Infografías Médicas ── */}
      {
        showInfografiasModal && (
          <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border/60 rounded-[var(--radius-lg)] shadow-xl w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up">
              {/* Header */}
              <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FileText size={18} className="text-salud-green" />
                  Infografías Médicas
                </h3>
                <button
                  onClick={() => {
                    setShowInfografiasModal(false);
                    setInfografiasSaving(false);
                  }}
                  className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">

                {/* Lista de Infografías Asignadas */}
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Infografías asignadas
                  </label>

                  {infografiasForm.items.length > 0 ? (
                    <ul className="space-y-2 mb-3">
                      {infografiasForm.items.map((info) => (
                        <li key={info.id} className="flex items-center gap-2 bg-bg-elevated rounded-[var(--radius-md)] px-3 py-2 border border-border/40">
                          <span className="w-5 h-5 rounded-full bg-salud-green/10 text-salud-green flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                            <FileText size={10} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm text-text-primary font-medium truncate">{info.titulo}</span>
                            <span className="block text-xs text-text-tertiary truncate">{info.url}</span>
                          </div>
                          <button
                            onClick={() => setInfografiasForm(f => ({
                              ...f,
                              items: f.items.filter(item => item.id !== info.id)
                            }))}
                            className="text-text-tertiary hover:text-salud-red transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-tertiary italic mb-4">Ninguna asignada aún.</p>
                  )}
                </div>

                {/* Formulario Añadir */}
                <div className="p-3 bg-bg-elevated/50 border border-border/40 rounded-[var(--radius-md)] space-y-3">
                  <p className="text-xs font-bold text-text-secondary uppercase">Añadir Nueva Infografía</p>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Título corto</label>
                    <Input
                      type="text"
                      placeholder="Ej: Guía de Hipertensión"
                      value={infografiasForm.titulo}
                      onChange={e => setInfografiasForm(f => ({ ...f, titulo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">URL (Drive, PDF, web)</label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={infografiasForm.url}
                      onChange={e => setInfografiasForm(f => ({ ...f, url: e.target.value }))}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    disabled={!infografiasForm.titulo.trim() || !infografiasForm.url.trim()}
                    onClick={() => {
                      setInfografiasForm(f => ({
                        ...f,
                        items: [...f.items, {
                          id: crypto.randomUUID(),
                          titulo: f.titulo.trim(),
                          url: f.url.trim()
                        }],
                        titulo: '',
                        url: ''
                      }));
                    }}
                  >
                    <Plus size={16} className="mr-1" /> Añadir a la lista
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/60 bg-bg-elevated/30 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowInfografiasModal(false);
                    setInfografiasSaving(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={infografiasSaving}
                  onClick={async () => {
                    setInfografiasSaving(true);
                    try {
                      await updatePatientInfografias(patient.id, infografiasForm.items);
                      setShowInfografiasModal(false);
                    } catch (err) {
                      console.error('Error guardando infografías:', err);
                      alert('Error al guardar las infografías. Intenta de nuevo.');
                    } finally {
                      setInfografiasSaving(false);
                    }
                  }}
                >
                  {infografiasSaving ? 'Guardando…' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* SlideOver Evaluacion */}
      <SlideOver
        isOpen={!!selectedEvaluation}
        onClose={() => setSelectedEvaluation(null)}
        title={selectedEvaluation ? `Detalle de Evaluación` : ''}
        width="max-w-xl"
      >
        {selectedEvaluation && (
          <div className="space-y-6 pb-10 mt-2">

            {/* Cabecera: Fecha y evaluador */}
            <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-[var(--radius-md)] border border-border/40">
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase">Fecha de Evaluación</p>
                <p className="text-base font-bold text-text-primary mt-0.5">
                  {new Date(selectedEvaluation.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              {selectedEvaluation.evaluadorNombre && (
                <div className="text-right">
                  <p className="text-xs text-text-tertiary font-bold uppercase">Evaluador</p>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{selectedEvaluation.evaluadorNombre}</p>
                </div>
              )}
            </div>

            {/* Sección 1: Antropometría */}
            <div>
              <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                <Scale size={12} /> Antropometría
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                  <p className="text-xs text-text-secondary mb-0.5">Peso</p>
                  <p className="text-xl font-extrabold text-text-primary">{selectedEvaluation.pesoKg} <span className="text-sm font-normal">kg</span></p>
                </div>
                <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                  <p className="text-xs text-text-secondary mb-0.5">Talla</p>
                  <p className="text-xl font-extrabold text-text-primary">{selectedEvaluation.tallaCm} <span className="text-sm font-normal">cm</span></p>
                </div>
                <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                  <p className="text-xs text-text-secondary mb-0.5">IMC</p>
                  <p className="text-xl font-extrabold text-salud-blue">{selectedEvaluation.resultados?.imc?.toFixed(1) || '—'}</p>
                  {selectedEvaluation.resultados?.clasificacionImc && (
                    <p className="text-xs text-text-tertiary mt-0.5">{selectedEvaluation.resultados.clasificacionImc}</p>
                  )}
                </div>
                <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                  <p className="text-xs text-text-secondary mb-0.5">Cintura / Cadera</p>
                  <p className="text-base font-bold text-text-primary">{selectedEvaluation.cinturaCm} / {selectedEvaluation.caderaCm} <span className="text-xs font-normal">cm</span></p>
                </div>
              </div>
            </div>

            {/* Sección 2: Composición Corporal */}
            {selectedEvaluation.composicionCorporal && Object.values(selectedEvaluation.composicionCorporal).some(v => v !== undefined) && (
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                  ⚡ Composición Corporal / Bioimpedancia
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedEvaluation.composicionCorporal.porcentajeGrasa !== undefined && (
                    <div className="bg-salud-amber-soft/40 p-3 rounded-lg border border-salud-amber/20">
                      <p className="text-xs text-text-secondary mb-0.5">Grasa Corporal</p>
                      <p className="text-xl font-extrabold text-salud-amber">{selectedEvaluation.composicionCorporal.porcentajeGrasa}<span className="text-sm font-normal">%</span></p>
                    </div>
                  )}
                  {selectedEvaluation.composicionCorporal.grasaVisceral !== undefined && (
                    <div className="bg-salud-red-soft/40 p-3 rounded-lg border border-salud-red/20">
                      <p className="text-xs text-text-secondary mb-0.5">Grasa Visceral</p>
                      <p className="text-xl font-extrabold text-salud-red">Niv. {selectedEvaluation.composicionCorporal.grasaVisceral}</p>
                    </div>
                  )}
                  {selectedEvaluation.composicionCorporal.musculoEsqueletico !== undefined && (
                    <div className="bg-salud-green-soft/40 p-3 rounded-lg border border-salud-green/20">
                      <p className="text-xs text-text-secondary mb-0.5">Músculo Esquelético</p>
                      <p className="text-xl font-extrabold text-salud-green">{selectedEvaluation.composicionCorporal.musculoEsqueletico}<span className="text-sm font-normal">%</span></p>
                    </div>
                  )}
                  {selectedEvaluation.composicionCorporal.musculoEsqueleticoKg !== undefined && (
                    <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                      <p className="text-xs text-text-secondary mb-0.5">Músculo (kg)</p>
                      <p className="text-xl font-extrabold text-text-primary">{selectedEvaluation.composicionCorporal.musculoEsqueleticoKg}<span className="text-sm font-normal"> kg</span></p>
                    </div>
                  )}
                  {selectedEvaluation.composicionCorporal.aguaCorporal !== undefined && (
                    <div className="bg-salud-blue-soft/40 p-3 rounded-lg border border-salud-blue/20">
                      <p className="text-xs text-text-secondary mb-0.5">Agua Corporal</p>
                      <p className="text-xl font-extrabold text-salud-blue">{selectedEvaluation.composicionCorporal.aguaCorporal}<span className="text-sm font-normal">%</span></p>
                    </div>
                  )}
                  {selectedEvaluation.composicionCorporal.edadMetabolica !== undefined && (
                    <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                      <p className="text-xs text-text-secondary mb-0.5">Edad Metabólica</p>
                      <p className="text-xl font-extrabold text-text-primary">{selectedEvaluation.composicionCorporal.edadMetabolica}<span className="text-sm font-normal"> años</span></p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección 3: Laboratorios */}
            {selectedEvaluation.laboratorios && Object.values(selectedEvaluation.laboratorios).some(v => v !== undefined && v !== '') && (
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                  <HeartPulse size={12} /> Laboratorios y Signos Vitales
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedEvaluation.laboratorios.glucosa !== undefined && (
                    <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                      <p className="text-xs text-text-secondary mb-0.5">Glucosa en ayunas</p>
                      <p className="text-lg font-bold text-text-primary">{selectedEvaluation.laboratorios.glucosa} <span className="text-xs font-normal">mg/dL</span></p>
                    </div>
                  )}
                  {selectedEvaluation.laboratorios.insulina !== undefined && (
                    <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                      <p className="text-xs text-text-secondary mb-0.5">Insulina basal</p>
                      <p className="text-lg font-bold text-text-primary">{selectedEvaluation.laboratorios.insulina} <span className="text-xs font-normal">µU/mL</span></p>
                    </div>
                  )}
                  {selectedEvaluation.laboratorios.homaIr !== undefined && (
                    <div className="col-span-2 bg-salud-red-soft/50 p-3 rounded-lg border border-salud-red/30 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-salud-red font-bold mb-0.5">🩺 HOMA-IR (Resistencia a la Insulina)</p>
                        <p className="text-xs text-text-secondary">{selectedEvaluation.laboratorios.homaIr < 2.5 ? 'Normal (< 2.5)' : selectedEvaluation.laboratorios.homaIr < 3.8 ? 'Riesgo moderado (2.5–3.8)' : 'Resistencia a la insulina (> 3.8)'}</p>
                      </div>
                      <p className="text-2xl font-extrabold text-salud-red">{selectedEvaluation.laboratorios.homaIr}</p>
                    </div>
                  )}
                  {selectedEvaluation.laboratorios.presionArterial && (
                    <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                      <p className="text-xs text-text-secondary mb-0.5">Presión Arterial</p>
                      <p className="text-lg font-bold text-text-primary">{selectedEvaluation.laboratorios.presionArterial} <span className="text-xs font-normal">mmHg</span></p>
                    </div>
                  )}
                  {selectedEvaluation.laboratorios.perfilLipidico && (
                    <div className="col-span-2 bg-bg-elevated p-3 rounded-lg border border-border/40">
                      <p className="text-xs text-text-secondary mb-0.5">Perfil Lipídico / Colesterol</p>
                      <p className="text-sm font-semibold text-text-primary">{selectedEvaluation.laboratorios.perfilLipidico}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección 4: Resultados Metabólicos */}
            {selectedEvaluation.resultados && (
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                  <Activity size={12} /> Resultados Metabólicos
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-salud-blue-soft/40 p-3 rounded-lg border border-salud-blue/20">
                    <p className="text-xs text-text-secondary mb-0.5">TMB (Basal)</p>
                    <p className="text-xl font-extrabold text-salud-blue">{Math.round(selectedEvaluation.resultados.tmb)} <span className="text-sm font-normal">kcal</span></p>
                  </div>
                  <div className="bg-salud-green-soft/40 p-3 rounded-lg border border-salud-green/20">
                    <p className="text-xs text-text-secondary mb-0.5">GET (Gasto Total)</p>
                    <p className="text-xl font-extrabold text-salud-green">{Math.round(selectedEvaluation.resultados.get)} <span className="text-sm font-normal">kcal</span></p>
                  </div>
                  <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                    <p className="text-xs text-text-secondary mb-0.5">Meta Hidratación</p>
                    <p className="text-lg font-bold text-text-primary">{selectedEvaluation.resultados.metaHidratacionMl} <span className="text-xs font-normal">mL</span></p>
                  </div>
                  <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                    <p className="text-xs text-text-secondary mb-0.5">Calorías Plan</p>
                    <p className="text-lg font-bold text-text-primary">{Math.round(selectedEvaluation.resultados.macros?.totalKcal ?? 0)} <span className="text-xs font-normal">kcal</span></p>
                  </div>
                </div>
                {selectedEvaluation.resultados.macros && (
                  <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                    <p className="text-xs text-text-secondary font-bold mb-2">Distribución de Macros</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-text-tertiary">Proteínas</p>
                        <p className="text-sm font-extrabold text-salud-blue">{Math.round(selectedEvaluation.resultados.macros.proteinas?.gramos ?? 0)}g</p>
                        <p className="text-xs text-text-tertiary">{Math.round(selectedEvaluation.resultados.macros.proteinas?.porcentaje ?? 0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-tertiary">Grasas</p>
                        <p className="text-sm font-extrabold text-salud-amber">{Math.round(selectedEvaluation.resultados.macros.grasas?.gramos ?? 0)}g</p>
                        <p className="text-xs text-text-tertiary">{Math.round(selectedEvaluation.resultados.macros.grasas?.porcentaje ?? 0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-tertiary">Carbohidratos</p>
                        <p className="text-sm font-extrabold text-salud-green">{Math.round(selectedEvaluation.resultados.macros.carbohidratos?.gramos ?? 0)}g</p>
                        <p className="text-xs text-text-tertiary">{Math.round(selectedEvaluation.resultados.macros.carbohidratos?.porcentaje ?? 0)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección 5: Plan y Estilo de Vida */}
            <div>
              <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                <Target size={12} /> Plan Clínico
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                  <p className="text-xs text-text-secondary mb-0.5">Objetivo</p>
                  <p className="text-sm font-bold text-text-primary capitalize">{Array.isArray(selectedEvaluation.objetivo) ? selectedEvaluation.objetivo.join(', ') : selectedEvaluation.objetivo}</p>
                </div>
                <div className="bg-bg-elevated p-3 rounded-lg border border-border/40">
                  <p className="text-xs text-text-secondary mb-0.5">Nivel Actividad</p>
                  <p className="text-sm font-bold text-text-primary">
                    {selectedEvaluation.nivelActividad === 1 ? 'Sedentario' :
                      selectedEvaluation.nivelActividad === 2 ? 'Ligero' :
                        selectedEvaluation.nivelActividad === 3 ? 'Moderado' :
                          selectedEvaluation.nivelActividad === 4 ? 'Activo' : 'Muy Activo'}
                  </p>
                </div>
                {selectedEvaluation.motivacion && (
                  <div className="col-span-2 bg-bg-elevated p-3 rounded-lg border border-border/40">
                    <p className="text-xs text-text-secondary mb-0.5">Motivación del Paciente</p>
                    <p className="text-sm text-text-primary">{selectedEvaluation.motivacion}</p>
                  </div>
                )}
                {selectedEvaluation.medicamentosActuales && (
                  <div className="col-span-2 bg-bg-elevated p-3 rounded-lg border border-border/40">
                    <p className="text-xs text-text-secondary mb-0.5 flex items-center gap-1"><Pill size={10} /> Medicamentos Actuales</p>
                    <p className="text-sm text-text-primary">{selectedEvaluation.medicamentosActuales}</p>
                  </div>
                )}
                {selectedEvaluation.restriccionesFisicas && selectedEvaluation.restriccionesFisicas.length > 0 && (
                  <div className="col-span-2 bg-salud-amber-soft/40 p-3 rounded-lg border border-salud-amber/20">
                    <p className="text-xs text-salud-amber font-bold mb-1.5">⚠ Restricciones Físicas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvaluation.restriccionesFisicas.map((r, i) => (
                        <span key={i} className="text-xs bg-salud-amber-soft text-salud-amber px-2 py-0.5 rounded-full font-semibold">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="col-span-2 bg-bg-elevated p-3 rounded-lg border border-border/40 flex items-center justify-between">
                  <p className="text-xs text-text-secondary">Apoyo Familiar</p>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${selectedEvaluation.apoyoFamiliar ? 'bg-salud-green-soft text-salud-green' : 'bg-salud-red-soft text-salud-red'}`}>
                    {selectedEvaluation.apoyoFamiliar ? '✓ Sí' : '✗ No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sección 6: Feedback de Anamnesis */}
            {selectedEvaluation.nivelEnergia !== undefined && (
              <div>
                <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                  <User size={12} /> Feedback del Paciente
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-elevated p-3 rounded-lg border border-border/40 text-center">
                    <p className="text-xs text-text-secondary mb-1">Energía</p>
                    <p className="text-xl font-extrabold text-salud-green">{selectedEvaluation.nivelEnergia}<span className="text-xs font-normal">/10</span></p>
                  </div>
                  <div className="bg-bg-elevated p-3 rounded-lg border border-border/40 text-center">
                    <p className="text-xs text-text-secondary mb-1">Digestión</p>
                    <p className="text-sm font-bold text-text-primary capitalize">{selectedEvaluation.calidadDigestion || '—'}</p>
                  </div>
                  <div className="bg-bg-elevated p-3 rounded-lg border border-border/40 text-center">
                    <p className="text-xs text-text-secondary mb-1">Ansiedad</p>
                    <p className="text-sm font-bold text-text-primary capitalize">{selectedEvaluation.nivelAnsiedad || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sección 7: Notas e Indicaciones */}
            <div>
              <p className="text-xs text-text-tertiary font-bold uppercase mb-3 flex items-center gap-1.5">
                <FileText size={12} /> Notas e Indicaciones
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-tertiary font-bold uppercase mb-1">🔒 Notas Clínicas (Privadas)</p>
                  <div className="p-3 bg-bg-card rounded-lg border border-border/40 text-sm text-text-secondary min-h-[70px] whitespace-pre-wrap">
                    {selectedEvaluation.notasProfesional || 'Sin notas registradas en esta evaluación.'}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-salud-green font-bold uppercase mb-1">💬 Indicaciones al Paciente (Visibles)</p>
                  <div className="p-3 bg-salud-green-soft/30 rounded-[var(--radius-md)] border border-salud-green/30 text-sm text-text-secondary min-h-[70px] whitespace-pre-wrap">
                    {selectedEvaluation.indicacionesPaciente || 'Sin indicaciones adicionales registradas.'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </SlideOver>

      {/* ── Modal Confirmar Eliminación ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-salud-red/30 rounded-[var(--radius-lg)] shadow-xl w-full max-w-md flex flex-col animate-slide-up">
            <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-salud-red flex items-center gap-2">
                <AlertTriangle size={20} />
                Eliminar Paciente
              </h3>
              <button
                onClick={() => !deleteLoading && setShowDeleteModal(false)}
                className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                disabled={deleteLoading}
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-text-primary">
                ¿Estás seguro de que deseas eliminar permanentemente a <strong>{patient.nombre} {patient.apellido}</strong>?
              </p>
              <div className="p-3 bg-salud-red/10 border border-salud-red/20 rounded-[var(--radius-md)] text-sm text-salud-red">
                <strong className="block mb-1">¡Advertencia!</strong>
                Esta acción es irreversible. Se perderá todo el historial clínico, diario de hidratación, evaluaciones e infografías asignadas a este paciente.
              </div>
            </div>

            <div className="p-4 border-t border-border/60 bg-bg-elevated/30 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-salud-red hover:bg-salud-red/90 text-white border-transparent"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await deletePatient(patient.id);
                    navigate('/staff/pacientes', { replace: true });
                  } catch (err) {
                    console.error('Error al eliminar paciente:', err);
                    alert('Hubo un error al eliminar el paciente. Por favor, intenta de nuevo.');
                    setDeleteLoading(false);
                  }
                }}
              >
                {deleteLoading ? 'Eliminando…' : 'Sí, eliminar permanentemente'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
