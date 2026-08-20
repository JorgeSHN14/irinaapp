/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Patient, PatientListItem, Evaluacion, StaffDashboardStats, CreatePatientData, PatientStatus } from '../types/patients';
import type { EvaluacionInicial, Prescripcion } from '../types/index';
import { calcularResultados } from '../utils/formulas';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

// =============================================
// Staff Context — Estado del Portal Médico
// =============================================

const PATIENTS_STORAGE_KEY = 'aviva_institution_patients';
const EVALUATIONS_STORAGE_KEY = 'aviva_institution_evaluations';

interface StaffState {
  patients: Patient[];
  evaluations: Evaluacion[];
  selectedPatientId: string | null;
  isLoading: boolean;
}

type StaffAction =
  | { type: 'LOAD_DATA'; payload: { patients: Patient[]; evaluations: Evaluacion[] } }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_PATIENT'; payload: Patient }
  | { type: 'DELETE_PATIENT'; payload: string }
  | { type: 'SELECT_PATIENT'; payload: string | null }
  | { type: 'ADD_EVALUATION'; payload: Evaluacion }
  | { type: 'DELETE_EVALUATION'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

/** Datos editables de un paciente (sin tocar auth ni evaluaciones) */
export interface UpdatePatientData {
  nombre: string;
  apellido?: string;
  cedula: string;
  telefono?: string;
  fechaNacimiento?: string;
  edad: number;
  sexo: import('../types').Sexo;
  tipoSangre?: string;
  alergias?: string[];
  pesoKg: number;
  tallaCm: number;
  cinturaCm: number;
  caderaCm: number;
  condiciones: import('../types').CondicionMedica[];
  objetivo: string[];
  nivelActividad: import('../types').NivelActividad;
  estatus: PatientStatus;
}

const initialStaffState: StaffState = {
  patients: [],
  evaluations: [],
  selectedPatientId: null,
  isLoading: false,
};

function staffReducer(state: StaffState, action: StaffAction): StaffState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        patients: action.payload.patients,
        evaluations: action.payload.evaluations,
        isLoading: false,
      };
    case 'ADD_PATIENT': {
      // Avoid duplicates from realtime vs local optimistic updates
      if (state.patients.some(p => p.id === action.payload.id)) return state;
      return { ...state, patients: [...state.patients, action.payload] };
    }
    case 'UPDATE_PATIENT':
      return {
        ...state,
        patients: state.patients.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
        selectedPatientId: state.selectedPatientId === action.payload ? null : state.selectedPatientId,
      };
    case 'SELECT_PATIENT':
      return { ...state, selectedPatientId: action.payload };
    case 'ADD_EVALUATION': {
      if (state.evaluations.some(e => e.id === action.payload.id)) return state;
      return { ...state, evaluations: [...state.evaluations, action.payload] };
    }
    case 'DELETE_EVALUATION':
      return {
        ...state,
        evaluations: state.evaluations.filter(e => e.id !== action.payload),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

/** Genera un UUID válido para Supabase */
function generateId(): string {
  return crypto.randomUUID();
}

// Helper para mapear base de datos a frontend
function mapDatabasePatient(p: any): Patient {
  return {
    id: p.id,
    userId: p.user_id,
    institutionId: p.institution_id,
    createdBy: p.created_by,
    assignedTo: p.assigned_to,
    nombre: p.nombre,
    apellido: p.apellido,
    cedula: p.cedula,
    email: p.email,
    telefono: p.telefono,
    fechaNacimiento: p.fecha_nacimiento,
    edad: p.edad,
    sexo: p.sexo,
    tipoSangre: p.tipo_sangre,
    alergias: p.alergias || [],
    estatus: p.estatus,
    pesoKg: p.peso_kg,
    tallaCm: p.talla_cm,
    cinturaCm: p.cintura_cm,
    caderaCm: p.cadera_cm,
    composicionCorporal: p.composicion_corporal,
    laboratorios: p.laboratorios,
    nivelActividad: p.nivel_actividad,
    objetivo: Array.isArray(p.objetivo) ? p.objetivo : (p.objetivo ? [p.objetivo] : []),
    condiciones: p.condiciones || [],
    resultadosActuales: p.resultados_actuales,
    rutinaVideoUrl: p.rutina_video_url || undefined,
    rutinaItems: p.rutina_items || undefined,
    infografias: p.infografias || [],
    totalEvaluaciones: p.total_evaluaciones || 0,
    ultimaEvaluacion: p.ultima_evaluacion || p.created_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// Helper para mapear base de datos a frontend
function mapDatabaseEvaluation(e: any): Evaluacion {
  return {
    id: e.id,
    patientId: e.patient_id,
    evaluadorId: e.evaluador_id,
    evaluadorNombre: e.evaluador_nombre,
    fecha: e.fecha || e.created_at,
    pesoKg: e.peso_kg,
    tallaCm: e.talla_cm,
    cinturaCm: e.cintura_cm,
    caderaCm: e.cadera_cm,
    composicionCorporal: e.composicion_corporal,
    nivelActividad: e.nivel_actividad,
    objetivo: Array.isArray(e.objetivo) ? e.objetivo : (e.objetivo ? [e.objetivo] : []),
    condiciones: e.condiciones || [],
    laboratorios: e.laboratorios || undefined,
    medicamentos: e.medicamentos || [],
    medicamentosActuales: e.medicamentos_actuales,
    restriccionesFisicas: e.restricciones_fisicas || [],
    apoyoFamiliar: e.apoyo_familiar,
    motivacion: e.motivacion,
    resultados: e.resultados,
    notasProfesional: e.notas_profesional,
  };
}

interface StaffContextType {
  state: StaffState;
  dispatch: React.Dispatch<StaffAction>;
  
  // Helpers
  getPatientById: (id: string) => Patient | undefined;
  getPatientEvaluations: (patientId: string) => Evaluacion[];
  getPatientList: () => PatientListItem[];
  getDashboardStats: () => StaffDashboardStats;
  getSelectedPatient: () => Patient | undefined;
  
  // Actions
  createPatient: (data: CreatePatientData) => Promise<Patient>;
  updatePatient: (patientId: string, data: UpdatePatientData) => Promise<Patient>;
  updatePatientRutina: (patientId: string, data: { videoUrl?: string; items?: string[] }) => Promise<void>;
  updatePatientInfografias: (patientId: string, infografias: import('../types/patients').Infografia[]) => Promise<void>;
  addEvaluation: (patientId: string, evaluationData: Omit<Evaluacion, 'id' | 'evaluadorId' | 'evaluadorNombre' | 'fecha' | 'resultados'>, measures: EvaluacionInicial) => Promise<Evaluacion>;
  addPrescription: (patientId: string, prescription: Omit<Prescripcion, 'id' | 'fechaInicio' | 'activa'>) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
}

const StaffContext = createContext<StaffContextType | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(staffReducer, initialStaffState);
  const { user } = useAuth();

  // Load data from Supabase on mount and listen to realtime changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadDataAndSubscribe() {
      if (!user) return;
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const [{ data: dbPatients, error: pError }, { data: dbEvals, error: eError }] = await Promise.all([
          supabase.from('patients').select('*'),
          supabase.from('evaluations').select('*')
        ]);

        if (pError) throw pError;
        if (eError) throw eError;

        const mappedPatients = (dbPatients || []).map(mapDatabasePatient);
        const mappedEvals = (dbEvals || []).map(mapDatabaseEvaluation);

        dispatch({ type: 'LOAD_DATA', payload: { patients: mappedPatients, evaluations: mappedEvals } });
        
        // Sync local storage
        localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(mappedPatients));
        localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(mappedEvals));

        // --- SETUP REALTIME SUBSCRIPTIONS ---
        channel = supabase.channel('staff-portal-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'patients' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                dispatch({ type: 'ADD_PATIENT', payload: mapDatabasePatient(payload.new) });
              } else if (payload.eventType === 'UPDATE') {
                dispatch({ type: 'UPDATE_PATIENT', payload: mapDatabasePatient(payload.new) });
              } else if (payload.eventType === 'DELETE') {
                dispatch({ type: 'DELETE_PATIENT', payload: payload.old.id });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'evaluations' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                dispatch({ type: 'ADD_EVALUATION', payload: mapDatabaseEvaluation(payload.new) });
              } else if (payload.eventType === 'DELETE') {
                dispatch({ type: 'DELETE_EVALUATION', payload: payload.old.id });
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        // Fallback to local storage if DB fails (e.g. offline)
        try {
          const patientsRaw = localStorage.getItem(PATIENTS_STORAGE_KEY);
          const evaluationsRaw = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
          const patients: Patient[] = patientsRaw ? JSON.parse(patientsRaw) : [];
          const evaluations: Evaluacion[] = evaluationsRaw ? JSON.parse(evaluationsRaw) : [];
          dispatch({ type: 'LOAD_DATA', payload: { patients, evaluations } });
        } catch { /* ignore */ }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    loadDataAndSubscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  // Persist to localStorage on changes
  useEffect(() => {
    if (state.patients.length > 0 || state.evaluations.length > 0) {
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(state.patients));
      localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(state.evaluations));
    }
  }, [state.patients, state.evaluations]);

  const getPatientById = (id: string) => state.patients.find(p => p.id === id);

  const getPatientEvaluations = (patientId: string) =>
    state.evaluations
      .filter(e => e.patientId === patientId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const getPatientList = (): PatientListItem[] =>
    state.patients.map(p => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      edad: p.edad,
      sexo: p.sexo,
      estatus: p.estatus,
      objetivo: p.objetivo,
      condiciones: p.condiciones,
      imc: p.resultadosActuales?.imc,
      clasificacionImc: p.resultadosActuales?.clasificacionImc,
      ultimaEvaluacion: p.ultimaEvaluacion,
      assignedTo: p.assignedTo,
    }));

  const getDashboardStats = (): StaffDashboardStats => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const activos = state.patients.filter(p => p.estatus === 'activo');
    const inactivos = state.patients.filter(p => p.estatus === 'inactivo');
    const evalsHoy = state.evaluations.filter(e => e.fecha.startsWith(today));
    const evalsSemana = state.evaluations.filter(e => e.fecha >= weekAgo);

    const imcValues = activos
      .map(p => p.resultadosActuales?.imc)
      .filter((v): v is number => v !== undefined);
    const promedioImc = imcValues.length > 0
      ? imcValues.reduce((a, b) => a + b, 0) / imcValues.length
      : 0;

    return {
      totalPacientesActivos: activos.length,
      totalPacientesInactivos: inactivos.length,
      totalEvaluacionesHoy: evalsHoy.length,
      totalEvaluacionesSemana: evalsSemana.length,
      promedioImc,
      promedioAdherencia: 0, // TODO: calculate from daily logs
      alertasCriticas: activos.filter(p =>
        p.resultadosActuales && (
          p.resultadosActuales.clasificacionImc === 'Obesidad' ||
          p.resultadosActuales.alertaHidratacion
        )
      ).length,
      pacientesRecientes: getPatientList()
        .sort((a, b) => {
          const dateA = a.ultimaEvaluacion || '';
          const dateB = b.ultimaEvaluacion || '';
          return dateB.localeCompare(dateA);
        })
        .slice(0, 5),
    };
  };

  const getSelectedPatient = () =>
    state.selectedPatientId ? getPatientById(state.selectedPatientId) : undefined;

  /**
   * Crea un nuevo paciente en el sistema.
   * Calcula automáticamente los resultados metabólicos iniciales mediante el motor clínico
   * y asigna un plan basado en los datos proporcionados.
   * 
   * @param {CreatePatientData} data - Datos demográficos y clínicos básicos recolectados en el onboarding.
   * @returns {Patient} El objeto del paciente recién creado y guardado.
   */
  const createPatient = async (data: CreatePatientData): Promise<Patient> => {
    const patientId = generateId();
    let userIdForPatient = generateId();
    const now = new Date().toISOString();

    // 1. Crear el usuario en Supabase a través de Edge Function para disparar el email
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-patient', {
      body: {
        email: data.email,
        password: data.passwordTemporal,
        nombre: data.nombre,
        apellido: data.apellido || '',
        cedula: data.cedula
      }
    });

    if (edgeError || edgeData?.error) {
      console.error('Error al registrar usuario en Supabase Auth:', edgeError || edgeData?.error);
      throw edgeError || new Error(edgeData?.error);
    }
    
    if (edgeData?.userId) {
      userIdForPatient = edgeData.userId; // El Edge Function devuelve el UUID creado
    }

    // Build EvaluacionInicial for formula calculation
    const evaluacionInicial: EvaluacionInicial = {
      userId: userIdForPatient,
      nombre: data.nombre,
      fecha: now,
      edad: data.edad,
      sexo: data.sexo,
      pesoKg: data.pesoKg,
      tallaCm: data.tallaCm,
      nivelActividad: data.nivelActividad,
      circunferenciaCinturaCm: data.cinturaCm,
      circunferenciaCaderaCm: data.caderaCm,
      objetivo: data.objetivo,
      condiciones: data.condiciones,
      laboratorios: data.laboratorios,
      medicamentos: data.medicamentos,
      medicamentosActuales: data.medicamentosActuales,
      restriccionesFisicas: data.restriccionesFisicas,
      apoyoFamiliar: data.apoyoFamiliar,
      motivacion: data.motivacion,
    };

    const resultados = calcularResultados(evaluacionInicial);

    const patient: Patient = {
      id: patientId,
      userId: userIdForPatient,
      institutionId: user?.institutionId || 'default',
      createdBy: user?.id || 'unknown',
      assignedTo: user?.id || 'unknown',
      nombre: data.nombre,
      apellido: data.apellido,
      cedula: data.cedula,
      email: data.email,
      telefono: data.telefono,
      fechaNacimiento: data.fechaNacimiento,
      edad: data.edad,
      sexo: data.sexo,
      tipoSangre: data.tipoSangre,
      alergias: data.alergias || [],
      estatus: 'activo',
      pesoKg: data.pesoKg,
      tallaCm: data.tallaCm,
      cinturaCm: data.cinturaCm,
      caderaCm: data.caderaCm,
      composicionCorporal: data.composicionCorporal,
      laboratorios: data.laboratorios,
      nivelActividad: data.nivelActividad,
      objetivo: data.objetivo,
      condiciones: data.condiciones,
      resultadosActuales: resultados,
      totalEvaluaciones: 1,
      ultimaEvaluacion: now,
      createdAt: now,
      updatedAt: now,
    };

    // TODO: A futuro insertar en la tabla patients y evaluations en Supabase,
    // por ahora combinamos con el estado legacy local para que el resto del UI funcione
    const { error: patientError } = await supabase.from('patients').insert({
      id: patientId,
      user_id: userIdForPatient,
      institution_id: patient.institutionId,
      created_by: patient.createdBy !== 'unknown' ? patient.createdBy : null,
      assigned_to: patient.assignedTo !== 'unknown' ? patient.assignedTo : null,
      nombre: patient.nombre,
      apellido: patient.apellido,
      cedula: patient.cedula,
      email: patient.email,
      telefono: patient.telefono,
      fecha_nacimiento: patient.fechaNacimiento,
      edad: patient.edad,
      sexo: patient.sexo,
      tipo_sangre: patient.tipoSangre,
      alergias: patient.alergias,
      estatus: patient.estatus,
      peso_kg: patient.pesoKg,
      talla_cm: patient.tallaCm,
      cintura_cm: patient.cinturaCm,
      cadera_cm: patient.caderaCm,
      composicion_corporal: patient.composicionCorporal || {},
      laboratorios: patient.laboratorios || {},
      nivel_actividad: patient.nivelActividad,
      objetivo: patient.objetivo,
      condiciones: patient.condiciones,
      resultados_actuales: patient.resultadosActuales,
    });

    if (patientError) {
      console.error('Error insertando en public.patients:', patientError);
      throw new Error(`Error al crear expediente médico: ${patientError.message}`);
    }

    // Create initial evaluation
    const evaluacionId = generateId();
    const evaluacion: Evaluacion = {
      id: evaluacionId,
      patientId,
      evaluadorId: user?.id || 'unknown',
      evaluadorNombre: user?.nombre || 'Sistema',
      fecha: now,
      pesoKg: data.pesoKg,
      tallaCm: data.tallaCm,
      cinturaCm: data.cinturaCm,
      caderaCm: data.caderaCm,
      composicionCorporal: data.composicionCorporal,
      nivelActividad: data.nivelActividad,
      objetivo: data.objetivo,
      condiciones: data.condiciones,
      laboratorios: data.laboratorios,
      medicamentos: data.medicamentos,
      medicamentosActuales: data.medicamentosActuales,
      restriccionesFisicas: data.restriccionesFisicas,
      apoyoFamiliar: data.apoyoFamiliar,
      motivacion: data.motivacion,
      resultados,
      notasProfesional: 'Evaluación inicial al registro del paciente.',
    };

    const { error: evalError } = await supabase.from('evaluations').insert({
      id: evaluacionId,
      patient_id: patientId,
      evaluador_id: user?.id !== 'unknown' ? user?.id : null,
      evaluador_nombre: user?.nombre,
      peso_kg: evaluacion.pesoKg,
      talla_cm: evaluacion.tallaCm,
      cintura_cm: evaluacion.cinturaCm,
      cadera_cm: evaluacion.caderaCm,
      composicion_corporal: evaluacion.composicionCorporal || {},
      nivel_actividad: evaluacion.nivelActividad,
      objetivo: evaluacion.objetivo,
      condiciones: evaluacion.condiciones,
      laboratorios: evaluacion.laboratorios,
      medicamentos: evaluacion.medicamentos,
      medicamentos_actuales: evaluacion.medicamentosActuales,
      restricciones_fisicas: evaluacion.restriccionesFisicas,
      apoyo_familiar: evaluacion.apoyoFamiliar,
      motivacion: evaluacion.motivacion,
      resultados: evaluacion.resultados,
      notas_profesional: evaluacion.notasProfesional,
    });

    if (evalError) {
      console.error('Error insertando evaluación inicial:', evalError);
      throw new Error(`Error al guardar evaluación: ${evalError.message}`);
    }

    // Also create the patient's user account in localStorage (legacy support)
    const existingUsers = JSON.parse(localStorage.getItem('aviva_users') || '[]');
    existingUsers.push({
      email: data.email,
      password: data.passwordTemporal,
      role: 'paciente',
      id: userIdForPatient,
      patientId,
      nombre: data.nombre,
    });
    localStorage.setItem('aviva_users', JSON.stringify(existingUsers));

    // Store patient data for patient context compatibility
    const allPatientsData = JSON.parse(localStorage.getItem('aviva_patients_data') || '{}');
    allPatientsData[data.email] = {
      evaluacion: evaluacionInicial,
      resultados,
      historialConsultas: [evaluacion],
      diario: {},
      registrosPeso: [],
      recetasUsuario: [],
      recetasFavoritas: [],
      calificaciones: {},
      prescripciones: [],
    };
    localStorage.setItem('aviva_patients_data', JSON.stringify(allPatientsData));

    dispatch({ type: 'ADD_PATIENT', payload: patient });
    dispatch({ type: 'ADD_EVALUATION', payload: evaluacion });

    return patient;
  };

  /**
   * Registra una nueva evaluación clínica de seguimiento para un paciente existente.
   * Recalcula el Gasto Energético Total (GET) y macronutrientes basados en el nuevo peso/talla/etc.,
   * y actualiza el estado general del paciente con estos nuevos resultados.
   * 
   * @param {string} patientId - ID del paciente a evaluar.
   * @param {Omit<Evaluacion, 'id' | 'evaluadorId' | 'evaluadorNombre' | 'fecha' | 'resultados'>} evaluationData - Datos directos de la evaluación.
   * @param {EvaluacionInicial} measures - Métricas para recalcular el metabolismo.
   * @returns {Evaluacion} El objeto de la evaluación guardada.
   */
  const addEvaluation = async (
    patientId: string,
    evaluationData: Omit<Evaluacion, 'id' | 'evaluadorId' | 'evaluadorNombre' | 'fecha' | 'resultados'>,
    measures: EvaluacionInicial
  ): Promise<Evaluacion> => {
    const resultados = calcularResultados(measures);
    const now = new Date().toISOString();

    const evaluacion: Evaluacion = {
      ...evaluationData,
      id: generateId(),
      evaluadorId: user?.id || 'unknown',
      evaluadorNombre: user?.nombre || 'Sistema',
      fecha: now,
      resultados,
    };

    const { error: evalError } = await supabase.from('evaluations').insert({
      id: evaluacion.id,
      patient_id: patientId,
      evaluador_id: user?.id !== 'unknown' ? user?.id : null,
      evaluador_nombre: user?.nombre,
      peso_kg: evaluacion.pesoKg,
      talla_cm: evaluacion.tallaCm,
      cintura_cm: evaluacion.cinturaCm,
      cadera_cm: evaluacion.caderaCm,
      composicion_corporal: evaluacion.composicionCorporal || {},
      nivel_actividad: evaluacion.nivelActividad,
      objetivo: evaluacion.objetivo,
      condiciones: evaluacion.condiciones,
      laboratorios: evaluacion.laboratorios || {},
      medicamentos: evaluacion.medicamentos,
      medicamentos_actuales: evaluacion.medicamentosActuales,
      restricciones_fisicas: evaluacion.restriccionesFisicas,
      apoyo_familiar: evaluacion.apoyoFamiliar,
      motivacion: evaluacion.motivacion,
      resultados: evaluacion.resultados,
      notas_profesional: evaluacion.notasProfesional,
    });

    if (evalError) {
      console.error('Error insertando evaluación en Supabase:', evalError);
    }

    // Update the patient with latest data
    const patient = getPatientById(patientId);
    if (patient) {
      const updatedPatient: Patient = {
        ...patient,
        pesoKg: evaluationData.pesoKg,
        tallaCm: evaluationData.tallaCm,
        cinturaCm: evaluationData.cinturaCm,
        caderaCm: evaluationData.caderaCm,
        composicionCorporal: evaluationData.composicionCorporal || patient.composicionCorporal,
        laboratorios: evaluationData.laboratorios || patient.laboratorios,
        nivelActividad: evaluationData.nivelActividad,
        objetivo: evaluationData.objetivo,
        condiciones: evaluationData.condiciones,
        resultadosActuales: resultados,
        totalEvaluaciones: patient.totalEvaluaciones + 1,
        ultimaEvaluacion: now,
        updatedAt: now,
      };

      const { error: patError } = await supabase.from('patients').update({
        peso_kg: updatedPatient.pesoKg,
        talla_cm: updatedPatient.tallaCm,
        cintura_cm: updatedPatient.cinturaCm,
        cadera_cm: updatedPatient.caderaCm,
        composicion_corporal: updatedPatient.composicionCorporal || {},
        laboratorios: updatedPatient.laboratorios || {},
        nivel_actividad: updatedPatient.nivelActividad,
        objetivo: updatedPatient.objetivo,
        condiciones: updatedPatient.condiciones,
        resultados_actuales: updatedPatient.resultadosActuales,
        total_evaluaciones: updatedPatient.totalEvaluaciones,
        ultima_evaluacion: updatedPatient.ultimaEvaluacion,
        updated_at: updatedPatient.updatedAt,
      }).eq('id', patientId);

      if (patError) {
        console.error('Error actualizando paciente en Supabase:', patError);
      }

      dispatch({ type: 'UPDATE_PATIENT', payload: updatedPatient });
    }

    dispatch({ type: 'ADD_EVALUATION', payload: evaluacion });
    return evaluacion;
  };

  /**
   * Actualiza los datos personales y clínicos de un paciente existente.
   * No modifica su cuenta de acceso (email/contraseña) ni elimina evaluaciones históricas.
   */
  const updatePatient = async (patientId: string, data: UpdatePatientData): Promise<Patient> => {
    const existing = getPatientById(patientId);
    if (!existing) throw new Error('Paciente no encontrado');

    const now = new Date().toISOString();

    // Recalcular resultados metabólicos con los nuevos datos
    const evaluacionInicial: EvaluacionInicial = {
      userId: existing.userId,
      nombre: data.nombre,
      fecha: now,
      edad: data.edad,
      sexo: data.sexo,
      pesoKg: data.pesoKg,
      tallaCm: data.tallaCm,
      nivelActividad: data.nivelActividad,
      circunferenciaCinturaCm: data.cinturaCm,
      circunferenciaCaderaCm: data.caderaCm,
      objetivo: data.objetivo,
      condiciones: data.condiciones,
      medicamentos: [],
      restriccionesFisicas: [],
      apoyoFamiliar: false,
      motivacion: '',
    };
    const resultados = calcularResultados(evaluacionInicial);

    const updatedPatient: Patient = {
      ...existing,
      nombre: data.nombre,
      apellido: data.apellido,
      cedula: data.cedula,
      telefono: data.telefono,
      fechaNacimiento: data.fechaNacimiento,
      edad: data.edad,
      sexo: data.sexo,
      tipoSangre: data.tipoSangre,
      alergias: data.alergias || [],
      estatus: data.estatus,
      pesoKg: data.pesoKg,
      tallaCm: data.tallaCm,
      cinturaCm: data.cinturaCm,
      caderaCm: data.caderaCm,
      condiciones: data.condiciones,
      objetivo: data.objetivo,
      nivelActividad: data.nivelActividad,
      resultadosActuales: resultados,
      updatedAt: now,
    };

    const { error } = await supabase.from('patients').update({
      nombre: updatedPatient.nombre,
      apellido: updatedPatient.apellido,
      cedula: updatedPatient.cedula,
      telefono: updatedPatient.telefono,
      fecha_nacimiento: updatedPatient.fechaNacimiento,
      edad: updatedPatient.edad,
      sexo: updatedPatient.sexo,
      tipo_sangre: updatedPatient.tipoSangre,
      alergias: updatedPatient.alergias,
      estatus: updatedPatient.estatus,
      peso_kg: updatedPatient.pesoKg,
      talla_cm: updatedPatient.tallaCm,
      cintura_cm: updatedPatient.cinturaCm,
      cadera_cm: updatedPatient.caderaCm,
      condiciones: updatedPatient.condiciones,
      objetivo: updatedPatient.objetivo,
      nivel_actividad: updatedPatient.nivelActividad,
      resultados_actuales: updatedPatient.resultadosActuales,
      updated_at: now,
    }).eq('id', patientId);

    if (error) {
      console.error('Error actualizando paciente:', error);
      throw new Error(`Error al actualizar paciente: ${error.message}`);
    }

    dispatch({ type: 'UPDATE_PATIENT', payload: updatedPatient });
    return updatedPatient;
  };

  /**
   * Actualiza la rutina de rehabilitación asignada a un paciente.
   * Solo modifica `rutina_video_url` y `rutina_items` sin recalcular macros ni plan nutricional.
   */
  const updatePatientRutina = async (patientId: string, data: { videoUrl?: string; items?: string[] }) => {
    const existing = getPatientById(patientId);
    if (!existing) throw new Error('Paciente no encontrado');

    const { error } = await supabase.from('patients').update({
      rutina_video_url: data.videoUrl || null,
      rutina_items: data.items && data.items.length > 0 ? data.items : null,
      updated_at: new Date().toISOString(),
    }).eq('id', patientId);

    if (error) {
      console.error('Error actualizando rutina:', error);
      throw new Error(`Error al guardar la rutina: ${error.message}`);
    }

    dispatch({
      type: 'UPDATE_PATIENT',
      payload: {
        ...existing,
        rutinaVideoUrl: data.videoUrl || undefined,
        rutinaItems: data.items && data.items.length > 0 ? data.items : undefined,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  /**
   * Actualiza la lista de infografías médicas asignadas a un paciente.
   */
  const updatePatientInfografias = async (patientId: string, infografias: import('../types/patients').Infografia[]) => {
    const existing = getPatientById(patientId);
    if (!existing) throw new Error('Paciente no encontrado');

    const { error } = await supabase.from('patients').update({
      infografias,
      updated_at: new Date().toISOString(),
    }).eq('id', patientId);

    if (error) {
      console.error('Error actualizando infografías:', error);
      throw new Error(`Error al guardar infografías: ${error.message}`);
    }

    dispatch({
      type: 'UPDATE_PATIENT',
      payload: {
        ...existing,
        infografias,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  /**
   * Agrega una prescripción médica (fármaco, suplemento) al plan del paciente.
   * Esta prescripción aparecerá en el "Dashboard" del paciente para su seguimiento diario de adherencia.
   * 
   * @param {string} patientId - ID del paciente.
   * @param {Omit<Prescripcion, 'id' | 'fechaInicio' | 'activa'>} prescription - Detalles del medicamento (dosis, frecuencia).
   */
  const addPrescription = async (patientId: string, prescription: Omit<Prescripcion, 'id' | 'fechaInicio' | 'activa'>) => {
    const patient = getPatientById(patientId);
    if (!patient) return;
    
    const { error } = await supabase.from('patient_prescriptions').insert({
      patient_id: patientId,
      medicamento: prescription.medicamento,
      dosis: prescription.dosis,
      frecuencia: prescription.frecuencia,
      duracion_dias: prescription.duracionDias,
      indicaciones: prescription.indicaciones,
    });
    
    if (error) {
      console.error('Error adding prescription:', error);
    }
  };

  /**
   * Elimina un paciente de forma permanente.
   * Esto borrará la fila en la tabla patients (y cascada si está configurado).
   */
  const deletePatient = async (patientId: string) => {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) {
      console.error('Error eliminando paciente:', error);
      throw new Error(`Error al eliminar paciente: ${error.message}`);
    }

    dispatch({ type: 'DELETE_PATIENT', payload: patientId });
  };

  return (
    <StaffContext.Provider value={{
      state,
      dispatch,
      getPatientById,
      getPatientEvaluations,
      getPatientList,
      getDashboardStats,
      getSelectedPatient,
      createPatient,
      updatePatient,
      updatePatientRutina,
      updatePatientInfografias,
      addEvaluation,
      addPrescription,
      deletePatient,
    }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff(): StaffContextType {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
}
