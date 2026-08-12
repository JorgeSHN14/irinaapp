import type { Receta, FiltrosReceta, CategoriaReceta, ResultadosMetabolicos, EvaluacionInicial } from '../types';

// =============================================
// Constantes de Filtrado
// =============================================

export const CATEGORIAS_RECETA: { value: CategoriaReceta; label: string; emoji: string }[] = [
  { value: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { value: 'almuerzo', label: 'Almuerzo', emoji: '🍽️' },
  { value: 'cena', label: 'Cena', emoji: '🌙' },
  { value: 'colacion', label: 'Colación', emoji: '🥤' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
  { value: 'bebida', label: 'Bebida', emoji: '🥤' },
  { value: 'postre_saludable', label: 'Postre', emoji: '🍮' },
];

export const RESTRICCIONES_DISPONIBLES: { value: string; label: string }[] = [
  { value: 'sin_lactosa', label: 'Sin lactosa' },
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'baja_en_sodio', label: 'Baja en sodio' },
  { value: 'baja_en_grasa', label: 'Baja en grasa' },
  { value: 'sin_azucar', label: 'Sin azúcar' },
];

export const TAGS_DISPONIBLES: { value: string; label: string }[] = [
  { value: 'alta_en_fibra', label: 'Alta en fibra' },
  { value: 'alta_en_proteina', label: 'Alta en proteína' },
  { value: 'antiinflamatoria', label: 'Antiinflamatoria' },
  { value: 'bajo_indice_glucemico', label: 'Bajo IG' },
  { value: 'rapida', label: 'Rápida' },
  { value: 'dieta_blanda', label: 'Dieta blanda' },
  { value: 'rica_en_omega3', label: 'Rica en omega-3' },
  { value: 'rica_en_hierro', label: 'Rica en hierro' },
  { value: 'rica_en_calcio', label: 'Rica en calcio' },
  { value: 'mexicana', label: 'Mexicana' },
  { value: 'cardiosaludable', label: 'Cardiosaludable' },
];

// =============================================
// Motor de Búsqueda Principal
// =============================================

/**
 * Busca y filtra recetas según los filtros proporcionados usando un catálogo completo.
 */
export function buscarRecetas(
  filtros: FiltrosReceta,
  catalogo: Receta[],
  favoritas: string[] = [],
  calificaciones: Record<string, number> = {}
): Receta[] {
  let todas: Receta[] = catalogo.map(r => ({
    ...r,
    favorita: favoritas.includes(r.id),
    calificacionUsuario: calificaciones[r.id] ?? r.calificacionUsuario,
  }));

  if (filtros.busqueda && filtros.busqueda.trim().length > 0) {
    const query = filtros.busqueda.toLowerCase().trim();
    todas = todas.filter(r =>
      r.nombre.toLowerCase().includes(query) ||
      (r.descripcion || '').toLowerCase().includes(query) ||
      (r.ingredientes || []).some(i => i.nombre.toLowerCase().includes(query)) ||
      (r.tags || []).some(t => t.toLowerCase().includes(query.replace(/ /g, '_')))
    );
  }

  if (filtros.categoria) todas = todas.filter(r => r.categoria === filtros.categoria);
  if (filtros.dificultad) todas = todas.filter(r => r.dificultad === filtros.dificultad);
  if (filtros.rangoKcal) {
    todas = todas.filter(r => {
      const kcal = (r.macros_por_porcion || r.macrosPorPorcion)?.kcal || 0;
      return kcal >= filtros.rangoKcal!.min && kcal <= filtros.rangoKcal!.max;
    });
  }
  if (filtros.condicionMedica) {
    todas = todas.filter(r => (r.apta_para_condiciones || r.aptaParaCondiciones || []).includes(filtros.condicionMedica!));
  }
  if (filtros.restricciones && filtros.restricciones.length > 0) {
    todas = todas.filter(r => filtros.restricciones!.every(rest => (r.restricciones || []).includes(rest)));
  }
  if (filtros.tags && filtros.tags.length > 0) {
    todas = todas.filter(r => filtros.tags!.some(tag => (r.tags || []).includes(tag)));
  }
  if (filtros.soloFavoritas) todas = todas.filter(r => r.favorita);
  if (filtros.origen) todas = todas.filter(r => r.origen === filtros.origen);
  if (filtros.tiempoMaxMin) {
    todas = todas.filter(r => {
      const tiempo = r.tiempo_preparacion_min || r.tiempoPreparacionMin || 0;
      return tiempo <= filtros.tiempoMaxMin!;
    });
  }
  if (filtros.cargaGlicemica) {
    todas = todas.filter(r => {
      const adv: any = r.datos_nutricionales_avanzados || r.datosNutricionalesAvanzados;
      const cg = adv?.carga_glicemica || adv?.cargaGlicemica;
      return cg === filtros.cargaGlicemica;
    });
  }
  if (filtros.sinAlergenos && filtros.sinAlergenos.length > 0) {
    todas = todas.filter(r => {
      const adv: any = r.datos_nutricionales_avanzados || r.datosNutricionalesAvanzados;
      if (!adv?.alergenos) return true;
      return filtros.sinAlergenos!.every(alergeno => !adv.alergenos!.includes(alergeno));
    });
  }
  if (filtros.dietaEspecial) {
    todas = todas.filter(r => {
      const adv: any = r.datos_nutricionales_avanzados || r.datosNutricionalesAvanzados;
      const apta = adv?.apta_para_dietas || adv?.aptaParaDietas || [];
      return apta.includes(filtros.dietaEspecial!);
    });
  }

  return todas;
}

// =============================================
// Motor de Recomendaciones
// =============================================

export function recomendarRecetasParaPaciente(
  evaluacion: EvaluacionInicial,
  resultados: ResultadosMetabolicos,
  catalogo: Receta[],
  favoritas: string[] = [],
  calificaciones: Record<string, number> = {}
): Receta[] {
  const condiciones = evaluacion.condiciones.filter(c => c !== 'ninguno');
  const restriccionesMenu = resultados.restriccionesMenu || [];

  let recomendadas = buscarRecetas(
    { sinAlergenos: evaluacion.alergias || [] }, 
    catalogo, favoritas, calificaciones
  ).filter(r => {
    const aptaPara = r.apta_para_condiciones || r.aptaParaCondiciones || [];
    if (condiciones.length === 0) {
      // Si no tiene ninguna patología, recomendar recetas generales
      return aptaPara.length === 0 || 
             aptaPara.includes('General') || 
             aptaPara.includes('Salud General') || 
             aptaPara.includes('general');
    }
    // Si tiene patologías, recomendar recetas indicadas para sus patologías
    return condiciones.some(c => aptaPara.includes(c));
  });

  if (restriccionesMenu.includes('sin_lactosa')) {
    recomendadas = recomendadas.filter(r => (r.restricciones || []).includes('sin_lactosa'));
  }
  if (restriccionesMenu.includes('dieta_blanda')) {
    recomendadas = recomendadas.filter(r => {
      const t = r.tags || [];
      return t.includes('dieta_blanda') || t.includes('facil_digestion');
    });
  }

  recomendadas.sort((a, b) => {
    const aptaA = a.apta_para_condiciones || a.aptaParaCondiciones || [];
    const aptaB = b.apta_para_condiciones || b.aptaParaCondiciones || [];
    const scoreA = condiciones.filter(c => aptaA.includes(c)).length;
    const scoreB = condiciones.filter(c => aptaB.includes(c)).length;
    if (scoreB === scoreA) return (b.calificacionUsuario ?? 0) - (a.calificacionUsuario ?? 0);
    return scoreB - scoreA;
  });

  return recomendadas;
}

export function recomendarParaTiempoComida(
  categoria: CategoriaReceta,
  evaluacion: EvaluacionInicial,
  resultados: ResultadosMetabolicos,
  catalogo: Receta[],
  favoritas: string[] = [],
  calificaciones: Record<string, number> = {}
): Receta[] {
  const todas = recomendarRecetasParaPaciente(evaluacion, resultados, catalogo, favoritas, calificaciones);
  return todas.filter(r => r.categoria === categoria);
}

// =============================================
// Utilidades
// =============================================

export function getRestriccionLabel(restriccion: string): string {
  const map: Record<string, string> = {
    'sin_lactosa': 'Sin Lactosa',
    'sin_gluten': 'Sin Gluten',
    'baja_en_sodio': 'Baja en Sodio',
    'baja_en_grasa': 'Baja en Grasa',
    'sin_azucar': 'Sin Azúcar',
    'dieta_blanda': 'Dieta Blanda',
  };
  return map[restriccion] || restriccion;
}

export function getTagLabel(tag: string): string {
  const map: Record<string, string> = {
    'alta_en_fibra': 'Alta en Fibra',
    'alta_en_proteina': 'Alta en Proteína',
    'antiinflamatoria': 'Antiinflamatoria',
    'bajo_indice_glucemico': 'Bajo Índice Glucémico',
    'rapida': 'Rápida',
    'dieta_blanda': 'Dieta Blanda',
    'rica_en_omega3': 'Rica en Omega-3',
    'rica_en_hierro': 'Rica en Hierro',
    'rica_en_calcio': 'Rica en Calcio',
    'mexicana': 'Mexicana',
    'cardiosaludable': 'Cardiosaludable',
    'facil_digestion': 'Fácil Digestión',
    'reconfortante': 'Reconfortante',
    'sin_azucar': 'Sin Azúcar',
    'hidratante': 'Hidratante',
    'snack': 'Snack',
    'baja_en_calorias': 'Baja en Calorías',
    'probioticos': 'Con Probióticos',
    'sin_calorias': 'Sin Calorías',
    'saciante': 'Saciante',
    'sin_mayonesa': 'Sin Mayonesa',
    'completa': 'Comida Completa',
    'bowl': 'Bowl',
    'baja_en_sodio': 'Baja en Sodio',
    'baja_en_colesterol': 'Baja en Colesterol',
    'postre': 'Postre',
    'horneado': 'Horneado',
    'textura_suave': 'Textura Suave',
    'antioxidante': 'Antioxidante',
  };
  return map[tag] || tag.replace(/_/g, ' ');
}

export function getCategoriaLabel(cat: CategoriaReceta): string {
  return CATEGORIAS_RECETA.find(c => c.value === cat)?.label || cat;
}

export function getCategoriaEmoji(cat: CategoriaReceta): string {
  return CATEGORIAS_RECETA.find(c => c.value === cat)?.emoji || '🍽️';
}

export function getDificultadLabel(dif: string): string {
  const map: Record<string, string> = { 'facil': 'Fácil', 'media': 'Media', 'avanzada': 'Avanzada' };
  return map[dif] || dif;
}
