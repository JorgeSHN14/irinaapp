// =============================================
// AVIVA — Sistema de Tipos Estrictos
// Definiciones TypeScript para datos clínicos
// =============================================

export type Sexo = 'hombre' | 'mujer';

export type NivelActividad = 1 | 2 | 3 | 4 | 5;

export type Objetivo = string;

export type CondicionMedica = string; // Ahora es un string dinámico proveniente de la tabla system_options

export interface SystemOption {
  id: string;
  categoria: 'condicion' | 'alergia' | 'medicamento' | 'restriccion_fisica' | 'objetivo';
  valor: string;
  icono?: string;
  descripcion?: string;
  activo: boolean;
}

export interface ComposicionCorporal {
  porcentajeGrasa?: number;       // % Grasa corporal total
  grasaVisceral?: number;         // Nivel / Índice de grasa visceral (1-20)
  musculoEsqueletico?: number;    // % Músculo esquelético
  musculoEsqueleticoKg?: number;  // kg de masa muscular
  aguaCorporal?: number;          // % Agua corporal total
  edadMetabolica?: number;        // Años (edad metabólica estimada)
}

export interface ClinicalContent {
  id: string;
  type: 'reto' | 'recomendacion' | 'rutina';
  title: string;
  description: string;
  icon?: string;
  trigger_condition?: string;
  trigger_objective?: string;
  is_active: boolean;
  created_at?: string;
  video_url?: string;       // URL de YouTube a la que redirigirá el botón "Ver Guía"
  items?: string[];         // Lista de ítems de la rutina (pasos a seguir)
}

/** Guía nutricional subida por el staff, asociada a 1+ condiciones médicas */
export interface NutritionGuide {
  id: string;
  titulo: string;
  descripcion?: string;
  url: string;                  // Link al PDF u otro recurso
  condiciones: string[];        // Valores de system_options categoria='condicion'
  subido_por?: string;          // UUID del staff
  subido_por_nombre?: string;   // Nombre para mostrar
  activo: boolean;
  created_at?: string;
}

export interface EvaluacionInicial {
  id?: string;
  userId: string;
  nombre: string;
  fecha: string;
  edad: number;
  sexo: Sexo;
  pesoKg: number;
  tallaCm: number;
  nivelActividad: NivelActividad;
  circunferenciaCinturaCm: number;
  circunferenciaCaderaCm: number;
  porcentajeGrasaOpcional?: number;
  composicionCorporal?: ComposicionCorporal;
  objetivo: string[];
  condiciones: CondicionMedica[];
  medicamentosActuales?: string;
  // Clínico Avanzado
  laboratorios?: {
    glucosa?: number;
    insulina?: number; // µU/mL
    homaIr?: number;
    presionArterial?: string; // ej: "120/80"
    perfilLipidico?: string;
  };
  medicamentos: string[];
  restriccionesFisicas: string[];
  // Psicosocial
  apoyoFamiliar: boolean;
  motivacion: string;
  alergias?: string[];
}

export interface MacroDetalle {
  gramos: number;
  kcal: number;
  porcentaje: number;
  kcalPorGramo: number; // 4 kcal/g para CHO/PROT, 9 kcal/g para Grasas
}

export interface ResultadosMetabolicos {
  imc: number;
  clasificacionImc: 'Bajo peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';
  tmb: number;
  get: number;
  metaHidratacionMl: number;
  alertaHidratacion: boolean;
  macros: {
    proteinas: MacroDetalle;
    grasas: MacroDetalle;
    carbohidratos: MacroDetalle;
    totalKcal: number;
  };
  restriccionesMenu: string[];
}

export interface GrupoAlimentoIntercambio {
  nombre: string;
  cho: number;
  proteina: number;
  grasa: number;
  kcal: number;
}

export interface IntercambioComida {
  grupo: string;
  raciones: number;
  cho: number;
  proteina: number;
  grasa: number;
  kcal: number;
}

export interface RegistroHidratacion {
  fecha: string;
  consumidoMl: number;
  metaMl: number;
}

export interface RegistroPeso {
  fecha: string;
  pesoKg: number;
}

// =============================================
// Motor Clínico SMAE
// =============================================

export interface SmaeRecord {
  id: string;
  categoria: string;
  subcategoria: string;
  cho: number;
  prot: number;
  grasas: number;
}

export interface MenuRacion {
  smae_id: string;
  cantidad: number;
}

export interface MenuTiempo {
  nombre: string;
  horario: string;
  raciones: MenuRacion[];
}

export interface MenuTemplate {
  id: string;
  target_kcal: number;
  nombre: string;
  tiempos: MenuTiempo[];
}

export interface AsignacionMenu {
  plantilla: MenuTemplate;
  mensajeLog: string;
  getAjustado: number;
}

export interface AdecuacionNutricional {
  cho: number;
  prot: number;
  grasas: number;
  kcal: number;
}

export interface EvaluacionMenu {
  real: AdecuacionNutricional;
  teorico: AdecuacionNutricional;
  porcentajeAdecuacion: {
    cho: number;
    prot: number;
    grasas: number;
    kcal: number;
  };
}

export interface RegistroConsumo {
  nombreComida: string; // ej. "Desayuno"
  racionesConsumidas: string[]; // array de smae_id
  completado: boolean;
  kcalConsumidas?: number;           // kcal aportadas por la receta seleccionada
  recetaSeleccionadaId?: string;     // id de la receta elegida
  recetaSeleccionadaNombre?: string; // nombre de la receta para mostrar en historial
}

export interface DailyLog {
  fecha: string; // Formato 'YYYY-MM-DD'
  hidratacionMl: number;
  comidasRegistradas: Record<string, RegistroConsumo>; 
  habitos?: RegistroHabitos;
  recetasPreparadas?: string[];
  adherenciaPrescripciones?: AdherenciaPrescripcion[];
}

// =============================================
// Sistema de Recetas
// =============================================

/** Categoría de receta para filtrado */
export type CategoriaReceta =
  | 'desayuno' | 'almuerzo' | 'cena' | 'colacion'
  | 'snack' | 'bebida' | 'postre_saludable';

/** Dificultad de preparación */
export type DificultadReceta = 'facil' | 'media' | 'avanzada';

/** Origen de la receta */
export type OrigenReceta = 'sistema' | 'usuario' | 'nutriologo' | 'ia';

/** Ingrediente de una receta con vínculo SMAE */
export interface IngredienteReceta {
  nombre: string;
  cantidad: number;
  unidad: string;
  smae_id?: string;
  racionesSmae?: number;
}

/** Receta completa */
export interface Receta {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaReceta;
  dificultad: DificultadReceta;
  tiempoPreparacionMin: number;
  origen: OrigenReceta;
  ingredientes: IngredienteReceta[];
  instrucciones: string[];
  porcionesRinde: number;
  macrosPorPorcion: {
    kcal: number;
    cho: number;
    prot: number;
    grasas: number;
    fibra?: number;
    sodio?: number;
  };
  /** Datos clínicos y nutricionales avanzados */
  datosNutricionalesAvanzados?: {
    cargaGlicemica?: 'baja' | 'media' | 'alta';
    alergenos?: string[]; // ej. 'Gluten', 'Lácteos', 'Nueces', 'Mariscos'
    vitaminas?: string[]; // ej. 'Hierro', 'Calcio', 'Vitamina C'
    aptaParaDietas?: string[]; // ej. 'Keto', 'Vegana', 'Vegetariana', 'Mediterránea'
  };
  aptaParaCondiciones: CondicionMedica[];
  restricciones: string[];
  tags: string[];
  imagenUrl?: string;
  favorita?: boolean;
  vecesPreparada?: number;
  calificacionUsuario?: number;
  fechaCreacion: string;

  // Campos de base de datos (Supabase snake_case)
  tiempo_preparacion_min?: number;
  porciones_rinde?: number;
  macros_por_porcion?: {
    kcal: number;
    cho: number;
    prot: number;
    grasas: number;
    fibra?: number;
    sodio?: number;
  };
  datos_nutricionales_avanzados?: {
    carga_glicemica?: 'baja' | 'media' | 'alta';
    alergenos?: string[];
    vitaminas?: string[];
    apta_para_dietas?: string[];
  };
  apta_para_condiciones?: CondicionMedica[];
}

/** Filtros de búsqueda para recetas */
export interface FiltrosReceta {
  busqueda?: string;
  categoria?: CategoriaReceta;
  dificultad?: DificultadReceta;
  rangoKcal?: { min: number; max: number };
  condicionMedica?: CondicionMedica;
  restricciones?: string[];
  tags?: string[];
  soloFavoritas?: boolean;
  origen?: OrigenReceta;
  tiempoMaxMin?: number;
  // Nuevos filtros
  cargaGlicemica?: 'baja' | 'media' | 'alta';
  sinAlergenos?: string[];
  dietaEspecial?: string;
}

// =============================================
// Registro Diario Mejorado
// =============================================

/** Registro de hábitos diarios (dolor, sueño, medicación) */
export interface RegistroHabitos {
  completado?: boolean;
  fechaCompletado?: string;
  medicacionTomada?: boolean; // Legacy: will be replaced by specific adherence
  horasSueno?: number;
  nivelDolor?: number;
  nivelEnergia?: number;
  estadoAnimo?: number;
  digestion?: 'normal' | 'estreñimiento' | 'diarrea' | 'inflamacion';
  glucosaCapilar?: number;
  presionArterialSistolica?: number;
  presionArterialDiastolica?: number;
  notasLibres?: string;
}

/** Prescripción médica */
export interface Prescripcion {
  id: string;
  medicamento: string;
  dosis: string; // ej. "500 mg"
  frecuencia: string; // ej. "Cada 8 horas"
  duracionDias: number;
  indicaciones: string;
  fechaInicio: string;
  activa: boolean;
}

/** Registro de adherencia a prescripciones */
export interface AdherenciaPrescripcion {
  prescripcionId: string;
  horaToma: string;
  tomada: boolean;
}

/** Estado global del contexto del paciente */
export interface PatientState {
  evaluacion: EvaluacionInicial | null;
  historialConsultas: any[]; // Se usa any temporalmente o Omit<Evaluacion,...> si se importa
  resultados: ResultadosMetabolicos | null;
  diario: Record<string, DailyLog>; // key: YYYY-MM-DD
  registrosPeso: RegistroPeso[];
  recetasUsuario: Receta[];
  recetasFavoritas: string[];
  calificaciones: Record<string, number>;
  prescripciones: Prescripcion[];
  // Rutina de rehabilitación asignada por el equipo médico
  rutinaVideoUrl?: string;
  rutinaItems?: string[];
  // Infografías médicas asignadas por el equipo médico
  infografias?: import('./patients').Infografia[];
}

// =============================================
// Módulo de IA para Recetas
// =============================================

export interface ParametrosGeneracionIA {
  ingredientes: string[];
  patologías: string[];
  categoria?: CategoriaReceta;
  caloriasObjetivo?: number;
  instruccionesAdicionales?: string;
}

