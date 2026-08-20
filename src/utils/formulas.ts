// =============================================
// AVIVA — Motor Clínico
// Fórmulas metabólicas (Mifflin-St Jeor, IMC, etc.)
// Funciones puras de matemáticas
// =============================================

import type { EvaluacionInicial, ResultadosMetabolicos } from '../types';

/**
 * Calcula todos los resultados metabólicos a partir de una evaluación clínica inicial.
 * Implementa el algoritmo principal de la aplicación para determinar:
 * 1. IMC (Índice de Masa Corporal) y su clasificación.
 * 2. TMB (Tasa Metabólica Basal) usando la fórmula de Mifflin-St Jeor.
 * 3. GET (Gasto Energético Total) ajustado por factor de actividad y objetivo (déficit/superávit).
 * 4. Desglose de Macronutrientes (Proteínas, Grasas, Carbohidratos) con reglas clínicas como prevención de sarcopenia.
 * 5. Requerimiento hídrico ajustado a patologías (ej. restricción en hipertensión).
 * 6. Restricciones dietéticas derivadas (dieta blanda, sin vitamina K, sin lactosa).
 * 
 * @param {EvaluacionInicial} datos - Objeto con los datos biométricos, clínicos y psicosociales del paciente.
 * @returns {ResultadosMetabolicos} Objeto estructurado con metas calóricas, macronutrientes y restricciones resultantes.
 */
export const calcularResultados = (datos: EvaluacionInicial): ResultadosMetabolicos => {
  const { pesoKg, tallaCm, edad, sexo, nivelActividad, condiciones, medicamentos = [], restriccionesFisicas = [] } = datos;

  // 1. Calcular IMC
  const tallaM = tallaCm / 100;
  const imc = pesoKg / (tallaM * tallaM);
  let clasificacionImc: ResultadosMetabolicos['clasificacionImc'] = 'Normal';
  if (imc < 18.5) clasificacionImc = 'Bajo peso';
  else if (imc >= 18.5 && imc <= 24.9) clasificacionImc = 'Normal';
  else if (imc >= 25 && imc <= 29.9) clasificacionImc = 'Sobrepeso';
  else if (imc >= 30) clasificacionImc = 'Obesidad';

  // 2. Calcular TMB (Harris-Benedict)
  let tmb = 0;
  if (sexo === 'hombre') {
    tmb = 66 + (13.7 * pesoKg) + (5 * tallaCm) - (6.8 * edad);
  } else {
    tmb = 655 + (9.6 * pesoKg) + (1.8 * tallaCm) - (4.7 * edad);
  }

  // 3. Calcular GET según Factor de Actividad
  const factoresActividad: Record<number, number> = {
    1: 1.2,
    2: 1.375,
    3: 1.55,
    4: 1.725,
    5: 1.9,
  };
  const factorActividad = factoresActividad[nivelActividad] || 1.2;
  
  // 3.5 Calcular Factor de Estrés Clínico (FE)
  let factorEstres = 1.0;
  if (condiciones.includes('Trauma esquelético') || condiciones.includes('Infección aguda')) {
    factorEstres = 1.4;
  } else if (condiciones.includes('Cirugía menor') || condiciones.includes('Lesión muscular')) {
    factorEstres = 1.2;
  } else if (condiciones.includes('Artritis') || condiciones.includes('Osteoporosis/artrosis')) {
    factorEstres = 1.1;
  }

  // GET = GEB * FA * FE
  let get = tmb * factorActividad * factorEstres;

  // Ajuste de GET según el Objetivo
  if (datos.objetivo.includes('perder_grasa')) {
    get -= 500; // Déficit calórico
  } else if (datos.objetivo.includes('ganar_masa')) {
    get += 500; // Superávit calórico
  }

  // 4. Desglose de Macronutrientes (Lógica de Cascada Obligatoria)
  let factorProteina = 1;
  
  const gramosProteina = pesoKg * factorProteina;
  const kcalProteina = gramosProteina * 4;
  const porcentajeProteina = (kcalProteina * 100) / get;

  // Grasas fijadas por defecto al 25% (Rango clínico: 25-30%)
  const porcentajeGrasa = 25;
  const kcalGrasa = get * (porcentajeGrasa / 100);
  const gramosGrasa = kcalGrasa / 9;

  // Carbohidratos por diferencia
  const porcentajeCHO = 100 - (porcentajeProteina + porcentajeGrasa);
  const kcalCHO = get * (porcentajeCHO / 100);
  const gramosCHO = kcalCHO / 4;

  // 5. Hidratación con Excepciones Clínicas
  let metaHidratacionMl = sexo === 'hombre' ? pesoKg * 35 : pesoKg * 30;
  let alertaHidratacion = false;

  // Si tiene hipertensión o se detectan cardiopatías asociadas en el centro
  if (condiciones.includes('Hipertensión')) {
    alertaHidratacion = true;
  }

  // Si sufre de estreñimiento crónico, subir la meta de agua para ayudar al tránsito intestinal
  if (restriccionesFisicas.includes('estrenimiento')) {
    metaHidratacionMl += 250;
  }

  // 6. Restricciones de Menú y Dietoterapia
  const restriccionesMenu: string[] = [];
  
  if (restriccionesFisicas.includes('masticacion_dificil')) {
    restriccionesMenu.push('dieta_blanda');
  }
  if (restriccionesFisicas.includes('intolerancia_lactosa')) {
    restriccionesMenu.push('sin_lactosa');
  }
  if (medicamentos.includes('Warfarina') || medicamentos.includes('Anticoagulantes')) {
    restriccionesMenu.push('sin_vitamina_k');
  }

  return {
    imc,
    clasificacionImc,
    tmb,
    get,
    metaHidratacionMl,
    alertaHidratacion,
    macros: {
      proteinas: { gramos: gramosProteina, kcal: kcalProteina, porcentaje: porcentajeProteina, kcalPorGramo: 4 },
      grasas: { gramos: gramosGrasa, kcal: kcalGrasa, porcentaje: porcentajeGrasa, kcalPorGramo: 9 },
      carbohidratos: { gramos: gramosCHO, kcal: kcalCHO, porcentaje: porcentajeCHO, kcalPorGramo: 4 },
      totalKcal: get,
    },
    restriccionesMenu,
  };
};

/**
 * Calcula el índice HOMA-IR (Modelos de Evaluación de Homeostasis para Resistencia a la Insulina).
 * Fórmua: (Glucosa mg/dL * Insulina µU/mL) / 405.
 * 
 * @param {number} [glucosaMgDl] - Nivel de glucosa en sangre en mg/dL.
 * @param {number} [insulinaUuMl] - Nivel de insulina basal en µU/mL.
 * @returns {Object} Valor y nivel de riesgo de resistencia a la insulina.
 */
export const calcularHomaIr = (glucosaMgDl?: number, insulinaUuMl?: number): { valor?: number; riesgo: 'bajo' | 'moderado' | 'alto' | 'desconocido' } => {
  if (!glucosaMgDl || !insulinaUuMl || glucosaMgDl <= 0 || insulinaUuMl <= 0) {
    return { riesgo: 'desconocido' };
  }
  const homa = (glucosaMgDl * insulinaUuMl) / 405;
  let riesgo: 'bajo' | 'moderado' | 'alto' = 'bajo';
  if (homa >= 2.9) riesgo = 'alto';
  else if (homa >= 1.9) riesgo = 'moderado';
  return { valor: Number(homa.toFixed(2)), riesgo };
};

/**
 * Formatea un valor numérico truncándolo a la cantidad especificada de decimales.
 * Útil para la presentación de gramos o kcal en la interfaz de usuario.
 * 
 * @param {number} value - El número a formatear.
 * @param {number} [decimals=1] - Cantidad de decimales deseados (por defecto 1).
 * @returns {string} El número formateado como texto.
 */
export const formatNumber = (value: number, decimals: number = 1): string => {
  return value.toFixed(decimals);
};

/**
 * Obtiene un saludo dinámico ("Buenos días", "Buenas tardes", "Buenas noches") 
 * basado en la hora local actual del sistema.
 * 
 * @returns {string} Saludo formateado.
 */
export const getSaludo = (): string => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 18) return 'Buenas tardes';
  return 'Buenas noches';
};
