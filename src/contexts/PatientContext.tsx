import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { EvaluacionInicial, PatientState, ResultadosMetabolicos, RegistroHabitos, Receta, DailyLog } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

type PatientAction =
  | { type: 'SET_EVALUACION'; payload: EvaluacionInicial }
  | { type: 'SET_RESULTADOS'; payload: ResultadosMetabolicos }
  | { type: 'LOG_WATER'; payload: { fecha: string; amount?: number; exactAmount?: number } }
  | { type: 'LOG_MEAL'; payload: { fecha: string; mealName: string; raciones: string[]; kcalConsumidas?: number; recetaId?: string; recetaNombre?: string } }
  | { type: 'LOG_HABITS'; payload: { fecha: string; habitos?: Partial<RegistroHabitos>; adherenciaPrescripciones?: any[] } }
  | { type: 'TOGGLE_FAVORITA'; payload: string }
  | { type: 'SAVE_RECETA'; payload: Receta }
  | { type: 'RATE_RECETA'; payload: { recetaId: string; calificacion: number } }
  | { type: 'HYDRATE'; payload: PatientState }
  | { type: 'RESET' };

const initialPatientState: PatientState = {
  evaluacion: null,
  historialConsultas: [],
  resultados: null,
  diario: {},
  registrosPeso: [],
  recetasUsuario: [],
  recetasFavoritas: [],
  calificaciones: {},
  prescripciones: [],
};

function patientReducer(state: PatientState, action: PatientAction): PatientState {
  switch (action.type) {
    case 'SET_EVALUACION':
      return { ...state, evaluacion: action.payload };
    case 'SET_RESULTADOS':
      return { ...state, resultados: action.payload };
    case 'LOG_WATER': {
      const { fecha, amount = 0, exactAmount } = action.payload;
      const todayLog = state.diario[fecha] || { fecha, hidratacionMl: 0, comidasRegistradas: {} };
      const newAmount = exactAmount !== undefined ? exactAmount : Math.max(0, todayLog.hidratacionMl + amount);
      return {
        ...state,
        diario: {
          ...state.diario,
          [fecha]: {
            ...todayLog,
            hidratacionMl: Math.max(0, newAmount)
          }
        }
      };
    }
    case 'LOG_MEAL': {
      const { fecha, mealName, raciones, kcalConsumidas, recetaId, recetaNombre } = action.payload;
      const todayLog = state.diario[fecha] || { fecha, hidratacionMl: 0, comidasRegistradas: {} };
      return {
        ...state,
        diario: {
          ...state.diario,
          [fecha]: {
            ...todayLog,
            comidasRegistradas: {
              ...todayLog.comidasRegistradas,
              [mealName]: {
                nombreComida: mealName,
                racionesConsumidas: raciones,
                completado: true,
                kcalConsumidas,
                recetaSeleccionadaId: recetaId,
                recetaSeleccionadaNombre: recetaNombre,
              }
            }
          }
        }
      };
    }
    case 'LOG_HABITS': {
      const { fecha, habitos, adherenciaPrescripciones } = action.payload;
      const todayLog = state.diario[fecha] || { fecha, hidratacionMl: 0, comidasRegistradas: {} };
      return {
        ...state,
        diario: {
          ...state.diario,
          [fecha]: {
            ...todayLog,
            ...(habitos ? {
              habitos: {
                ...(todayLog.habitos || {}),
                ...habitos
              }
            } : {}),
            ...(adherenciaPrescripciones ? { adherenciaPrescripciones } : {})
          }
        }
      };
    }
    case 'TOGGLE_FAVORITA': {
      const id = action.payload;
      const ya = state.recetasFavoritas.includes(id);
      return {
        ...state,
        recetasFavoritas: ya
          ? state.recetasFavoritas.filter(f => f !== id)
          : [...state.recetasFavoritas, id]
      };
    }
    case 'SAVE_RECETA':
      return {
        ...state,
        recetasUsuario: [...state.recetasUsuario, action.payload]
      };
    case 'RATE_RECETA': {
      const { recetaId, calificacion } = action.payload;
      return {
        ...state,
        calificaciones: {
          ...state.calificaciones,
          [recetaId]: calificacion
        }
      };
    }
    case 'HYDRATE':
      return {
        ...action.payload,
        diario: action.payload.diario || {},
        historialConsultas: action.payload.historialConsultas || [],
        recetasUsuario: action.payload.recetasUsuario || [],
        recetasFavoritas: action.payload.recetasFavoritas || [],
        calificaciones: action.payload.calificaciones || {},
        prescripciones: action.payload.prescripciones || [],
      };
    case 'RESET':
      return initialPatientState;
    default:
      return state;
  }
}

interface PatientContextType {
  state: PatientState;
  dispatch: React.Dispatch<PatientAction>;
}

export const PatientContext = createContext<PatientContextType | null>(null);

export function usePatient(): PatientContextType {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}

export function PatientDataProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [patientState, patientDispatch] = useReducer(patientReducer, initialPatientState);
  const patientIdRef = useRef<string | null>(null);
  
  // Custom dispatcher to handle side-effects for Supabase
  const dispatch = (action: PatientAction) => {
    // 1. Optimistic update
    patientDispatch(action);
    
    // 2. Network side effects
    if (!patientIdRef.current) return;
    const patientId = patientIdRef.current;
    
    try {
      if (action.type === 'LOG_WATER' || action.type === 'LOG_MEAL' || action.type === 'LOG_HABITS') {
        // Wait briefly for react state to update, then sync the specific day
        setTimeout(async () => {
           // Since patientState in this closure is stale, we calculate it using the action, or we fetch it from the next state.
           // A safer way is to just let a global useEffect handle the `diario` sync with a debounce.
        }, 0);
      }
      
      if (action.type === 'TOGGLE_FAVORITA') {
        const recipeId = action.payload;
        const isFav = !patientState.recetasFavoritas.includes(recipeId);
        if (isFav) {
          supabase.from('patient_favorite_recipes').insert({ patient_id: patientId, recipe_id: recipeId }).then();
        } else {
          supabase.from('patient_favorite_recipes').delete().eq('patient_id', patientId).eq('recipe_id', recipeId).then();
        }
      }
      
      if (action.type === 'RATE_RECETA') {
        supabase.from('patient_recipe_ratings').upsert({
          patient_id: patientId,
          recipe_id: action.payload.recetaId,
          calificacion: action.payload.calificacion
        }).then();
      }
    } catch (e) {
      console.error('Error syncing to DB', e);
    }
  };

  // Sync the `diario` to supabase when it changes
  const prevDiarioRef = useRef<Record<string, DailyLog>>({});
  
  useEffect(() => {
    if (!patientIdRef.current) return;
    const pid = patientIdRef.current;
    
    // Find which date changed
    const current = patientState.diario;
    const prev = prevDiarioRef.current;
    
    Object.keys(current).forEach(fecha => {
      if (current[fecha] !== prev[fecha] && current[fecha]) {
        // Sync this specific date
        const log = current[fecha];
        supabase.from('patient_daily_logs').upsert({
          patient_id: pid,
          fecha: fecha,
          hidratacion_ml: log.hidratacionMl,
          comidas_registradas: log.comidasRegistradas || {},
          habitos: log.habitos || {},
          adherencia_prescripciones: log.adherenciaPrescripciones || []
        }).then(({ error }) => {
          if (error) console.error('Error syncing diario', error);
        });
      }
    });
    
    prevDiarioRef.current = current;
  }, [patientState.diario]);

  // Load patient data from Supabase
  useEffect(() => {
    let channels: any[] = [];
    
    async function loadFromSupabase() {
      if (!isLoggedIn || !user) {
        patientDispatch({ type: 'RESET' });
        patientIdRef.current = null;
        return;
      }
      
      try {
        const { data: patientData, error: pError } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (pError || !patientData) throw pError;
        
        const patientId = patientData.id;
        patientIdRef.current = patientId;
        
        const [
          { data: logs },
          { data: prescriptions },
          { data: favorites },
          { data: ratings },
          { data: evals }
        ] = await Promise.all([
          supabase.from('patient_daily_logs').select('*').eq('patient_id', patientId),
          supabase.from('patient_prescriptions').select('*').eq('patient_id', patientId).eq('activa', true),
          supabase.from('patient_favorite_recipes').select('recipe_id').eq('patient_id', patientId),
          supabase.from('patient_recipe_ratings').select('*').eq('patient_id', patientId),
          supabase.from('evaluations').select('*').eq('patient_id', patientId).order('fecha', { ascending: true })
        ]);

        const mappedEvals = (evals || []).map((e: any) => ({
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
          objetivo: e.objetivo,
          condiciones: e.condiciones || [],
          laboratorios: e.laboratorios || undefined,
          medicamentos: e.medicamentos || [],
          medicamentosActuales: e.medicamentos_actuales,
          restriccionesFisicas: e.restricciones_fisicas || [],
          apoyoFamiliar: e.apoyo_familiar,
          motivacion: e.motivacion,
          resultados: e.resultados,
          notasProfesional: e.notas_profesional,
        }));

        const latestEval = mappedEvals.length > 0 ? mappedEvals[mappedEvals.length - 1] : null;

        const diario: Record<string, DailyLog> = {};
        logs?.forEach((log: any) => {
          diario[log.fecha] = {
            fecha: log.fecha,
            hidratacionMl: log.hidratacion_ml,
            comidasRegistradas: log.comidas_registradas || {},
            habitos: log.habitos || {},
            adherenciaPrescripciones: log.adherencia_prescripciones || []
          };
        });

        const mappedPrescriptions = prescriptions?.map((p: any) => ({
          id: p.id,
          medicamento: p.medicamento,
          dosis: p.dosis,
          frecuencia: p.frecuencia,
          duracionDias: p.duracion_dias,
          indicaciones: p.indicaciones,
          fechaInicio: p.fecha_inicio,
          activa: p.activa
        })) || [];

        const mappedFavorites = favorites?.map((f: any) => f.recipe_id) || [];

        const mappedRatings: Record<string, number> = {};
        ratings?.forEach((r: any) => {
          mappedRatings[r.recipe_id] = r.calificacion;
        });

        const evaluacion: EvaluacionInicial = {
          userId: user.id,
          nombre: patientData.nombre,
          fecha: patientData.ultima_evaluacion || patientData.created_at,
          edad: patientData.edad,
          sexo: patientData.sexo,
          pesoKg: patientData.peso_kg,
          tallaCm: patientData.talla_cm,
          nivelActividad: patientData.nivel_actividad,
          circunferenciaCinturaCm: patientData.cintura_cm,
          circunferenciaCaderaCm: patientData.cadera_cm,
          composicionCorporal: patientData.composicion_corporal || latestEval?.composicionCorporal,
          laboratorios: patientData.laboratorios || latestEval?.laboratorios,
          objetivo: patientData.objetivo,
          condiciones: patientData.condiciones || [],
          medicamentos: [],
          restriccionesFisicas: [],
          apoyoFamiliar: true,
          motivacion: 'Media'
        };

        const registrosPeso = mappedEvals.map(e => ({
          fecha: e.fecha,
          pesoKg: e.pesoKg
        }));

        const hydratedState = {
          evaluacion,
          historialConsultas: mappedEvals,
          resultados: patientData.resultados_actuales,
          diario,
          registrosPeso,
          recetasUsuario: [],
          recetasFavoritas: mappedFavorites,
          calificaciones: mappedRatings,
          prescripciones: mappedPrescriptions,
          rutinaVideoUrl: patientData.rutina_video_url || undefined,
          rutinaItems: patientData.rutina_items || undefined,
          infografias: patientData.infografias || [],
        };
        
        prevDiarioRef.current = diario; // Prevent initial hydration from triggering the useEffect sync
        patientDispatch({ type: 'HYDRATE', payload: hydratedState });
        
        // REALTIME: Listen to changes if another device updates
        const channel = supabase.channel(`patient-${patientId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_daily_logs', filter: `patient_id=eq.${patientId}` }, () => loadFromSupabase())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_prescriptions', filter: `patient_id=eq.${patientId}` }, () => loadFromSupabase())
          .subscribe();
          
        channels.push(channel);
        
      } catch (e) {
        console.error('Error fetching patient data:', e);
      }
    }
    
    loadFromSupabase();
    
    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isLoggedIn, user]);

  return (
    <PatientContext.Provider value={{ state: patientState, dispatch }}>
      {children}
    </PatientContext.Provider>
  );
}
