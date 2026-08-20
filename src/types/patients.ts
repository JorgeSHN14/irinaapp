// =============================================
// AVIVA — Tipos de Pacientes Institucionales
// Modelo de datos para gestión clínica
// =============================================

import type { CondicionMedica, NivelActividad, Sexo, ComposicionCorporal, ResultadosMetabolicos } from './index';

/** Infografía médica individual para el paciente */
export interface Infografia {
  id: string;
  titulo: string;
  url: string;
}

/** Estado del paciente en la institución */
export type PatientStatus = 'activo' | 'inactivo' | 'alta';

/** Paciente completo (modelo institucional) */
export interface Patient {
  id: string;
  userId: string;           // ID del usuario (cuenta de acceso)
  institutionId: string;
  createdBy: string;         // ID del médico/nutricionista que lo creó
  assignedTo: string;        // ID del profesional asignado actualmente
  
  // Datos personales
  nombre: string;
  apellido?: string;
  cedula: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;  // ISO date
  edad: number;
  sexo: Sexo;
  tipoSangre?: string;
  alergias?: string[];
  
  // Estado
  estatus: PatientStatus;
  
  // Datos clínicos actuales (última evaluación)
  pesoKg: number;
  tallaCm: number;
  cinturaCm: number;
  caderaCm: number;
  composicionCorporal?: ComposicionCorporal;
  laboratorios?: {
    glucosa?: number;
    insulina?: number;
    homaIr?: number;
    presionArterial?: string;
    perfilLipidico?: string;
  };
  nivelActividad: NivelActividad;
  objetivo: string[];
  condiciones: CondicionMedica[];
  
  // Resultados metabólicos actuales
  resultadosActuales?: ResultadosMetabolicos;
  
  // Rutina de Rehabilitación asignada por el equipo médico
  rutinaVideoUrl?: string;   // URL de YouTube configurada por el nutricionista
  rutinaItems?: string[];    // Lista de pasos/ejercicios de la rutina
  
  // Infografías médicas individuales
  infografias?: Infografia[];
  
  // Metadata
  totalEvaluaciones: number;
  ultimaEvaluacion?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

/** Vista resumida para listas/tablas */
export interface PatientListItem {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  edad: number;
  sexo: Sexo;
  estatus: PatientStatus;
  objetivo: string[];
  condiciones: CondicionMedica[];
  imc?: number;
  clasificacionImc?: string;
  ultimaEvaluacion?: string;
  assignedTo: string;
  assignedToName?: string;
}

/** Datos para crear un nuevo paciente */
export interface CreatePatientData {
  // Acceso
  email: string;
  passwordTemporal: string;
  
  // Personales
  nombre: string;
  apellido?: string;
  cedula: string;
  telefono?: string;
  fechaNacimiento?: string;
  edad: number;
  sexo: Sexo;
  tipoSangre?: string;
  alergias?: string[];
  
  // Antropométricos
  pesoKg: number;
  tallaCm: number;
  cinturaCm: number;
  caderaCm: number;
  composicionCorporal?: ComposicionCorporal;
  
  // Clínicos
  condiciones: CondicionMedica[];
  laboratorios?: {
    glucosa?: number;
    insulina?: number; // µU/mL
    homaIr?: number;
    presionArterial?: string;
    perfilLipidico?: string;
  };
  medicamentos: string[];
  medicamentosActuales?: string;
  restriccionesFisicas: string[];
  
  // Objetivos
  objetivo: string[];
  nivelActividad: NivelActividad;
  apoyoFamiliar: boolean;
  motivacion: string;
}

/** Evaluación clínica realizada por un profesional */
export interface Evaluacion {
  id: string;
  patientId: string;
  evaluadorId: string;
  evaluadorNombre: string;
  fecha: string; // ISO date
  
  // Medidas
  pesoKg: number;
  tallaCm: number;
  cinturaCm: number;
  caderaCm: number;
  composicionCorporal?: ComposicionCorporal;
  nivelActividad: NivelActividad;
  objetivo: string[];
  
  // Clínico
  condiciones: CondicionMedica[];
  laboratorios?: {
    glucosa?: number;
    insulina?: number; // µU/mL
    homaIr?: number;
    presionArterial?: string;
    perfilLipidico?: string;
  };
  medicamentos: string[];
  medicamentosActuales?: string;
  restriccionesFisicas: string[];
  apoyoFamiliar: boolean;
  motivacion: string;
  
  // Resultados calculados
  resultados: ResultadosMetabolicos;
  
  // Anamnesis / Feedback del paciente
  nivelEnergia?: number; // 1-10
  calidadDigestion?: 'excelente' | 'buena' | 'regular' | 'mala';
  nivelAnsiedad?: 'ninguna' | 'baja' | 'moderada' | 'alta';
  
  // Notas del profesional
  notasProfesional?: string;
  // Indicaciones y feedback visibles para el paciente
  indicacionesPaciente?: string;
}

/** Filtros para la lista de pacientes */
export interface PatientFilters {
  busqueda?: string;
  estatus?: PatientStatus;
  condicion?: CondicionMedica;
  objetivo?: string[];
  assignedTo?: string;
}

/** Estadísticas del dashboard médico */
export interface StaffDashboardStats {
  totalPacientesActivos: number;
  totalPacientesInactivos: number;
  totalEvaluacionesHoy: number;
  totalEvaluacionesSemana: number;
  promedioImc: number;
  promedioAdherencia: number;
  alertasCriticas: number;
  pacientesRecientes: PatientListItem[];
}
