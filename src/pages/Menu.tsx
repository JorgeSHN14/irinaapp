import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePatient } from '../App';
import { useNavigate } from 'react-router-dom';
import EmptyPatientState from '../components/patient/EmptyPatientState';
import { ChevronLeft, ChevronRight, Volume2, CheckCircle2, Square, ChefHat, UtensilsCrossed, Flame, CheckSquare, ChevronDown, ChevronUp, Star, Clock, ExternalLink } from 'lucide-react';
import type { MenuTiempo, Receta, CategoriaReceta } from '../types';
import { getSmaeRecord, evaluateMenu, asignarPlantillaOptima } from '../utils/engine';
import Card from '../components/ui/Card';
import MacroChart from '../components/dashboard/MacroChart';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import recetasData from '../data/recetas_sistema.json';

const ALL_RECIPES = recetasData as Receta[];

// =============================================
// Utilidades de Selección de Recetas por Día
// =============================================

/** Hash numérico determinista de la fecha para rotación diaria */
function hashDia(fecha: string): number {
  return fecha.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

/** Categoria SMAE → categoría de receta */
const MEAL_TO_CATEGORIA: Record<string, CategoriaReceta> = {
  'Desayuno': 'desayuno',
  'Almuerzo': 'almuerzo',
  'Cena': 'cena',
  'Colación 1': 'colacion',
  'Colación 2': 'colacion',
};

/**
 * Obtiene 2-3 recetas recomendadas para un tiempo de comida,
 * priorizando patologías del paciente y rotando determinísticamente por día.
 */
function getRecetasParaMeal(
  mealNombre: string,
  condiciones: string[],
  fecha: string,
  targetKcal: number,
  count = 3,
): Receta[] {
  const categoria = MEAL_TO_CATEGORIA[mealNombre] || 'almuerzo';
  const hash = hashDia(fecha);

  // Pool: recetas de la categoría correcta
  const pool = ALL_RECIPES.filter(r => r.categoria === categoria);

  if (pool.length === 0) return [];

  const condicionesFiltradas = condiciones.filter(c => c && c !== 'ninguno');

  // Función de score
  const score = (r: Receta): number => {
    let s = 0;
    const aptaPara = r.aptaParaCondiciones || (r as any).apta_para_condiciones || [];
    // +10 por cada condición del paciente que cubre la receta
    condicionesFiltradas.forEach(c => { if (aptaPara.includes(c)) s += 10; });
    // +5 si el kcal de la receta está dentro del ±30% del target del tiempo
    const kcal = r.macrosPorPorcion?.kcal || (r as any).macros_por_porcion?.kcal || 0;
    if (targetKcal > 0 && Math.abs(kcal - targetKcal) / targetKcal <= 0.30) s += 5;
    // +2 si es fácil
    if (r.dificultad === 'facil') s += 2;
    return s;
  };

  // Ordenar por score descendente, luego aplicar offset de rotación
  const sorted = [...pool].sort((a, b) => score(b) - score(a));
  const offset = hash % Math.max(1, sorted.length);

  // Rotar el array
  const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];

  // Para colaciones: asegurar que las 2 opciones sean distintas entre Colación 1 y Colación 2
  const extraOffset = mealNombre === 'Colación 2' ? Math.floor(sorted.length / 2) : 0;
  const rotatedFinal = [...rotated.slice(extraOffset), ...rotated.slice(0, extraOffset)];

  return rotatedFinal.slice(0, count);
}

// =============================================
// Mapeo amigable de grupos de intercambio
// =============================================
const FRIENDLY_NAMES: Record<string, string> = {
  'cereales_altos_cho_bajos_grasas': 'Cereales (Altos en carbohidratos)',
  'cereales_medios_cho_bajos_grasas': 'Cereales integrales',
  'cereales_medios_cho_medios_grasas': 'Cereales y grasas',
  'lacteos_enteros': 'Lácteos (Enteros)',
  'lacteos_descremados_bajos_grasas': 'Lácteos (Descremados)',
  'vegetales_bajos_cho': 'Vegetales Frescos',
  'vegetales_libre': 'Vegetales de libre consumo',
  'frutas_medias_cho': 'Frutas Enteras',
  'frutas_bajas_cho': 'Frutas (Bajas en azúcar)',
  'carnes_bajas_grasas': 'Carnes magras / Proteína',
  'carnes_medias_grasas': 'Carnes regulares / Huevos',
  'leguminosas': 'Frijoles / Lentejas',
  'grasas_altas_grasas': 'Grasas saludables',
  'grasas_medias_grasas': 'Grasas con proteína',
  'azucares': 'Azúcares simples',
};


// =============================================
// Barra de Progreso Calórico Diario
// =============================================
interface KcalProgressBarProps {
  kcalConsumidas: number;
  kcalObjetivo: number;
  tiemposTotal: number;
  tiemposCompletados: number;
}

function KcalProgressBar({ kcalConsumidas, kcalObjetivo, tiemposTotal, tiemposCompletados }: KcalProgressBarProps) {
  const pct = kcalObjetivo > 0 ? Math.min((kcalConsumidas / kcalObjetivo) * 100, 110) : 0;
  const margen = kcalObjetivo * 0.05;
  const dentroRango = kcalConsumidas >= (kcalObjetivo - margen) && kcalConsumidas <= (kcalObjetivo + margen);
  const excede = kcalConsumidas > kcalObjetivo + margen;
  const color = excede ? 'bg-salud-red' : dentroRango ? 'bg-salud-green' : 'bg-salud-blue';
  const textColor = excede ? 'text-salud-red' : dentroRango ? 'text-salud-green' : 'text-salud-blue';

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flame size={16} className={textColor} />
          <span className="text-sm font-bold text-text-primary">Calorías del Día</span>
        </div>
        <div className="text-right">
          <span className={`text-lg font-extrabold ${textColor}`}>{Math.round(kcalConsumidas)}</span>
          <span className="text-xs text-text-tertiary"> / {Math.round(kcalObjetivo)} kcal</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-bg-elevated rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-secondary">
          {tiemposCompletados} de {tiemposTotal} comidas completadas
        </span>
        {dentroRango && kcalConsumidas > 0 && (
          <span className="text-xs font-bold text-salud-green bg-salud-green-soft/30 px-2 py-0.5 rounded-full">
            ✓ En objetivo
          </span>
        )}
        {excede && (
          <span className="text-xs font-bold text-salud-red bg-salud-red-soft/30 px-2 py-0.5 rounded-full">
            Excede objetivo
          </span>
        )}
        {!dentroRango && !excede && kcalConsumidas > 0 && (
          <span className="text-xs text-text-tertiary">
            Faltan {Math.round(kcalObjetivo - kcalConsumidas)} kcal
          </span>
        )}
      </div>
    </Card>
  );
}

// =============================================
// Tarjeta de Receta Recomendada
// =============================================
interface RecipeCardProps {
  receta: Receta;
  isSelected: boolean;
  onSelect: () => void;
  condicionesPaciente: string[];
}

function RecipeCard({ receta, isSelected, onSelect, condicionesPaciente }: RecipeCardProps) {
  const navigate = useNavigate();
  const macros = receta.macrosPorPorcion || (receta as any).macros_por_porcion;
  const kcal = macros?.kcal || 0;
  const prot = macros?.prot || 0;
  const cho = macros?.cho || 0;
  const grasas = macros?.grasas || 0;
  const tiempo = receta.tiempoPreparacionMin || (receta as any).tiempo_preparacion_min || 0;
  const aptaPara = receta.aptaParaCondiciones || (receta as any).apta_para_condiciones || [];
  const matchCondicion = condicionesPaciente.some(c => aptaPara.includes(c));

  return (
    <div
      className={`w-full rounded-2xl border-2 transition-all duration-200 p-3.5 ${
        isSelected
          ? 'border-salud-green bg-salud-green/5 shadow-md'
          : 'border-border/50 bg-bg-card hover:border-salud-blue/40 hover:shadow-sm'
      }`}
    >
      {/* Área clickeable para seleccionar */}
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              {isSelected && <CheckCircle2 size={14} className="text-salud-green shrink-0" />}
              <h4 className="text-sm font-bold text-text-primary leading-tight truncate">{receta.nombre}</h4>
            </div>
            {matchCondicion && (
              <span className="inline-block text-[10px] font-bold text-salud-blue bg-salud-blue-soft/20 border border-salud-blue/20 px-1.5 py-0.5 rounded-full">
                ✓ Apto para tu condición
              </span>
            )}
          </div>
          <div className={`shrink-0 text-right px-2.5 py-1 rounded-xl ${isSelected ? 'bg-salud-green/10' : 'bg-bg-elevated'}`}>
            <p className={`text-base font-extrabold leading-none ${isSelected ? 'text-salud-green' : 'text-salud-blue'}`}>{kcal}</p>
            <p className="text-[10px] text-text-tertiary font-semibold">kcal</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mb-2">{receta.descripcion}</p>

        <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-salud-blue inline-block" />{prot}g Prot</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-salud-amber inline-block" />{cho}g Carbs</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-salud-red inline-block" />{grasas}g Grasas</span>
          {tiempo > 0 && (
            <span className="flex items-center gap-1 ml-auto"><Clock size={11} />{tiempo} min</span>
          )}
        </div>
      </button>

      {/* Botón Ver Receta Completa */}
      <div className="mt-2.5 pt-2.5 border-t border-border/30">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/app/recetas?receta=${receta.id}`);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-salud-blue hover:text-salud-blue/80 transition-colors cursor-pointer"
        >
          <ExternalLink size={12} />
          Ver receta completa
        </button>
      </div>
    </div>
  );
}

// =============================================
// MealSection
// =============================================
interface MealSectionProps {
  meal: MenuTiempo;
  condiciones: string[];
  delay?: string;
  selectedDate: string;
  onComplete?: (mealName: string) => void;
}

function MealSection({ meal, condiciones, delay, selectedDate, onComplete }: MealSectionProps) {
  const { state, dispatch } = usePatient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showExchanges, setShowExchanges] = useState(false);
  const [selectedRaciones, setSelectedRaciones] = useState<string[]>([]);
  const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const logActual = state.diario?.[selectedDate]?.comidasRegistradas?.[meal.nombre];
  const isCompleted = !!logActual;

  // Calcular kcal teóricas de este tiempo según raciones SMAE
  const kcalSmae = useMemo(() => {
    return meal.raciones.reduce((acc, r) => {
      const record = getSmaeRecord(r.smae_id);
      if (!record) return acc;
      return acc + (record.cho * 4 + record.prot * 4 + record.grasas * 9) * r.cantidad;
    }, 0);
  }, [meal.raciones]);

  // Recetas recomendadas para este tiempo
  const recetasRecomendadas = useMemo(() => {
    return getRecetasParaMeal(meal.nombre, condiciones, selectedDate, kcalSmae, 3);
  }, [meal.nombre, condiciones, selectedDate, kcalSmae]);

  const handleOpenModal = () => {
    if (isCompleted) return;
    setSelectedRaciones(meal.raciones.map(r => r.smae_id));
    setSelectedRecetaId(recetasRecomendadas[0]?.id || null);
    setIsOpen(true);
  };

  const handleToggleRacion = (id: string) => {
    setSelectedRaciones(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleSaveMeal = () => {
    const recetaElegida = recetasRecomendadas.find(r => r.id === selectedRecetaId);
    const kcalConsumidas = recetaElegida
      ? (recetaElegida.macrosPorPorcion?.kcal || (recetaElegida as any).macros_por_porcion?.kcal || 0)
      : undefined;

    dispatch({
      type: 'LOG_MEAL',
      payload: {
        fecha: selectedDate,
        mealName: meal.nombre,
        raciones: selectedRaciones,
        kcalConsumidas,
        recetaId: recetaElegida?.id,
        recetaNombre: recetaElegida?.nombre,
      }
    });
    setIsOpen(false);
    if (onComplete) setTimeout(() => onComplete(meal.nombre), 300);
  };

  // TTS
  const spanishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const pickBestSpanishVoice = useCallback(() => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const VOICE_PRIORITY = ['es-US', 'es-MX', 'es-CO', 'es-AR', 'es-ES'];
    const premiumVoices = voices.filter(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Sabina') || v.name.includes('Elena') || v.name.includes('Premium')));
    if (premiumVoices.length > 0) return premiumVoices[0];
    for (const lang of VOICE_PRIORITY) { const match = voices.find(v => v.lang === lang); if (match) return match; }
    return voices.find(v => v.lang.startsWith('es')) ?? null;
  }, []);

  useEffect(() => {
    const load = () => { spanishVoiceRef.current = pickBestSpanishVoice(); };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, [pickBestSpanishVoice]);

  const handleSpeak = useCallback(() => {
    if (!window.speechSynthesis) return;
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    window.speechSynthesis.cancel();
    let text = `Para tu ${meal.nombre.toLowerCase()}, te recomendamos ${recetasRecomendadas.length > 0 ? 'las siguientes opciones de recetas. ' : 'seguir tu plan de raciones. '}`;
    recetasRecomendadas.forEach((r, i) => {
      const kcal = r.macrosPorPorcion?.kcal || 0;
      text += `Opción ${i + 1}: ${r.nombre}, con ${kcal} calorías. `;
    });
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    if (spanishVoiceRef.current) { utterance.voice = spanishVoiceRef.current; utterance.lang = spanishVoiceRef.current.lang; }
    utterance.rate = 0.95; utterance.pitch = 1;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, meal.nombre, recetasRecomendadas]);

  if (meal.raciones.length === 0) return null;

  const recetaRegistrada = isCompleted && logActual?.recetaSeleccionadaNombre;
  const kcalRegistradas = isCompleted && logActual?.kcalConsumidas;

  return (
    <div className={`${delay} animate-fade-in`}>
      <Card padding="md">
        {/* Meal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenModal}
              disabled={isCompleted}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isCompleted ? 'bg-salud-green border-salud-green text-white cursor-default' : 'border-border text-transparent hover:border-salud-green/50 cursor-pointer'}`}
              aria-label={`Registrar ${meal.nombre}`}
            >
              <CheckCircle2 size={16} className={isCompleted ? "opacity-100" : "opacity-0"} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-secondary">{meal.horario}</span>
                {isCompleted && (
                  <span className="bg-salud-green-soft/30 text-salud-green text-[10px] border border-salud-green/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Completado
                  </span>
                )}
              </div>
              {recetaRegistrada && (
                <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                  <Star size={10} className="text-salud-amber" />
                  {logActual.recetaSeleccionadaNombre}
                  {kcalRegistradas && <span className="font-bold text-salud-green ml-1">· {Math.round(kcalRegistradas)} kcal</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeak}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${isPlaying ? 'text-salud-red bg-salud-red-soft hover:bg-salud-red/20' : 'text-text-secondary bg-bg-elevated hover:bg-border/50 hover:text-text-primary'}`}
              aria-label={isPlaying ? "Detener voz" : "Escuchar menú en voz alta"}
            >
              {isPlaying ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={() => {
                const catMap: Record<string, string> = { 'Desayuno': 'desayuno', 'Almuerzo': 'almuerzo', 'Cena': 'cena', 'Colación 1': 'colacion', 'Colación 2': 'colacion' };
                navigate(`/recetas?categoria=${catMap[meal.nombre] || 'almuerzo'}`);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-salud-blue/30 bg-salud-blue-soft/10 text-salud-blue text-xs font-bold hover:bg-salud-blue-soft/20 transition-colors shadow-sm"
            >
              <ChefHat size={16} />
              Ver recetas
            </button>
          </div>
        </div>

        {/* Recetas Recomendadas */}
        {recetasRecomendadas.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-gradient-to-br from-salud-blue to-salud-green flex items-center justify-center text-white text-[9px]">✦</span>
              Opciones recomendadas para tu plan
              {condiciones.filter(c => c !== 'ninguno').length > 0 && (
                <span className="text-salud-blue normal-case font-normal">· adaptadas a tu perfil médico</span>
              )}
            </p>
            <div className="space-y-2">
              {recetasRecomendadas.map(receta => (
                <RecipeCard
                  key={receta.id}
                  receta={receta}
                  isSelected={false}
                  onSelect={handleOpenModal}
                  condicionesPaciente={condiciones}
                />
              ))}
            </div>
            {!isCompleted && (
              <button
                onClick={handleOpenModal}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-salud-blue to-salud-green/70 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all hover:opacity-90 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                Registrar mi selección de hoy
              </button>
            )}
          </div>
        )}

        {/* Plan SMAE colapsable */}
        <button
          onClick={() => setShowExchanges(v => !v)}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors w-full cursor-pointer"
        >
          {showExchanges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span className="font-semibold">Ver raciones del plan SMAE ({meal.raciones.length} grupos)</span>
        </button>

        {showExchanges && (
          <div className="mt-3 rounded-xl border border-border/40 overflow-hidden">
            {meal.raciones.map((racion, idx) => {
              const record = getSmaeRecord(racion.smae_id);
              if (!record) return null;
              const friendlyName = FRIENDLY_NAMES[record.id] || record.subcategoria;
              return (
                <div key={`${racion.smae_id}-${idx}`} className="flex items-center justify-between p-2.5 border-b border-border/40 last:border-0 bg-bg-elevated/50">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-salud-blue opacity-70" />
                    <p className="font-medium text-text-primary text-sm">{friendlyName}</p>
                  </div>
                  <p className="text-xs font-bold text-salud-blue bg-salud-blue-soft/20 px-2 py-0.5 rounded-md">
                    {racion.cantidad} {racion.cantidad === 1 ? 'ración' : 'raciones'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL: Registrar comida */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Registrar ${meal.nombre}`}>
          <div className="space-y-5">
            {/* Selección de receta */}
            {recetasRecomendadas.length > 0 && (
              <div>
                <p className="text-sm font-bold text-text-primary mb-1">¿Qué opción elegiste hoy?</p>
                <p className="text-xs text-text-secondary mb-3">Selecciona la receta que consumiste para llevar un registro preciso de tus calorías.</p>
                <div className="space-y-2">
                  {recetasRecomendadas.map(receta => (
                    <RecipeCard
                      key={receta.id}
                      receta={receta}
                      isSelected={selectedRecetaId === receta.id}
                      onSelect={() => setSelectedRecetaId(receta.id)}
                      condicionesPaciente={condiciones}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setSelectedRecetaId(null)}
                  className={`mt-2 w-full text-xs py-2 rounded-xl border transition-colors cursor-pointer ${selectedRecetaId === null ? 'border-salud-amber bg-salud-amber/5 text-salud-amber font-bold' : 'border-border/40 text-text-tertiary hover:border-border'}`}
                >
                  Otro / No seguí ninguna de las opciones
                </button>
              </div>
            )}

            {/* Raciones SMAE */}
            <div>
              <p className="text-sm font-bold text-text-primary mb-2">Raciones consumidas del plan</p>
              <div className="space-y-2">
                {meal.raciones.map(racion => {
                  const record = getSmaeRecord(racion.smae_id);
                  if (!record) return null;
                  const isSelected = selectedRaciones.includes(racion.smae_id);
                  const friendlyName = FRIENDLY_NAMES[record.id] || record.subcategoria;
                  return (
                    <div
                      key={racion.smae_id}
                      onClick={() => handleToggleRacion(racion.smae_id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${isSelected ? 'bg-salud-green/10 border-salud-green text-text-primary' : 'bg-bg-elevated border-border/40 text-text-secondary hover:border-border'}`}
                    >
                      {isSelected ? <CheckSquare className="text-salud-green shrink-0" /> : <Square className="text-text-tertiary shrink-0" />}
                      <div>
                        <p className="font-bold text-sm">{friendlyName}</p>
                        <p className="text-xs opacity-80">{racion.cantidad} raciones</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button variant="secondary" onClick={() => { setSelectedRaciones(meal.raciones.map(r => r.smae_id)); }} fullWidth>
                Comí Todo
              </Button>
              <Button variant="primary" onClick={handleSaveMeal} fullWidth>
                Guardar Registro
              </Button>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}

// =============================================
// Página Principal: Menú del Día
// =============================================
export default function Menu() {
  const { state } = usePatient();
  const { resultados, evaluacion } = state;
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const selectedDate = new Date().toISOString().split('T')[0];

  if (!resultados) {
    return <EmptyPatientState />;
  }

  const asignacion = asignarPlantillaOptima(resultados.get);
  const template = asignacion.plantilla;

  evaluateMenu(template.id, {
    cho: resultados.macros.carbohidratos.gramos,
    prot: resultados.macros.proteinas.gramos,
    grasas: resultados.macros.grasas.gramos,
    kcal: resultados.macros.totalKcal,
  });

  // Calcular kcal consumidas hoy
  const logDiario = state.diario?.[selectedDate]?.comidasRegistradas || {};
  const kcalConsumidas = Object.values(logDiario).reduce((acc, log) => {
    return acc + (log.kcalConsumidas || 0);
  }, 0);
  const tiemposCompletados = Object.keys(logDiario).length;

  // Auto-select first uncompleted meal
  const activeMealName = activeTab || (() => {
    const uncompleted = template?.tiempos.find(m => !logDiario[m.nombre]);
    if (uncompleted) return uncompleted.nombre;
    const hour = new Date().getHours();
    if (hour < 11) return 'Desayuno';
    if (hour < 13) return 'Colación 1';
    if (hour < 16) return 'Almuerzo';
    if (hour < 19) return 'Colación 2';
    return 'Cena';
  })();

  const activeMealData = template?.tiempos.find(m => m.nombre === activeMealName) || template?.tiempos[0];

  const handleMealComplete = (completedMealName: string) => {
    const uncompleted = template?.tiempos.find(m => m.nombre !== completedMealName && !logDiario[m.nombre]);
    if (uncompleted) setActiveTab(uncompleted.nombre);
  };

  const condicionesPaciente = evaluacion?.condiciones || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
          <UtensilsCrossed size={24} className="text-salud-green" />
          Menú del Día
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Plan nutricional personalizado y balanceado
        </p>
      </div>

      {/* Barra de progreso calórico */}
      <KcalProgressBar
        kcalConsumidas={kcalConsumidas}
        kcalObjetivo={resultados.get}
        tiemposTotal={template?.tiempos.length || 0}
        tiemposCompletados={tiemposCompletados}
      />

      {/* Macro distribution overview */}
      <Card padding="sm">
        <h2 className="text-sm font-bold text-text-primary mb-2">
          Tus Macronutrientes de Hoy
        </h2>
        <MacroChart
          proteinas={resultados.macros.proteinas}
          grasas={resultados.macros.grasas}
          carbohidratos={resultados.macros.carbohidratos}
          totalKcal={resultados.macros.totalKcal}
        />
        <div className="mt-3 p-2.5 rounded-lg bg-bg-elevated/60 border border-border/50 text-xs text-text-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            <span>
              <strong className="text-text-primary">Cálculo de Calorías por Gramo:</strong> 1g Proteína = <span className="text-salud-blue font-bold">4 kcal</span> · 1g Carbohidrato = <span className="text-salud-green font-bold">4 kcal</span> · 1g Grasa = <span className="text-salud-amber font-bold">9 kcal</span>.
            </span>
          </div>
        </div>
      </Card>

      {/* Resumen rápido de comidas del día */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {template?.tiempos.map(t => {
          const done = !!logDiario[t.nombre];
          const isActive = t.nombre === activeMealData?.nombre;
          return (
            <button
              key={t.nombre}
              onClick={() => setActiveTab(t.nombre)}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'border-salud-blue bg-salud-blue text-white shadow-md'
                  : done
                  ? 'border-salud-green/40 bg-salud-green-soft/20 text-salud-green'
                  : 'border-border/50 bg-bg-card text-text-secondary hover:border-salud-blue/30'
              }`}
            >
              <span>{done ? '✓' : '○'}</span>
              <span className="truncate max-w-[60px]">{t.nombre}</span>
            </button>
          );
        })}
      </div>

      {/* Navegación principal */}
      <div className="flex items-center justify-between bg-bg-card border border-border/40 rounded-full p-1 shadow-sm">
        <button
          onClick={() => {
            const idx = template?.tiempos.findIndex(m => m.nombre === activeMealData?.nombre) ?? 0;
            if (idx > 0 && template) setActiveTab(template.tiempos[idx - 1].nombre);
          }}
          disabled={!template || template.tiempos.findIndex(m => m.nombre === activeMealData?.nombre) === 0}
          className="p-2 text-text-secondary hover:text-salud-blue disabled:opacity-30 disabled:hover:text-text-secondary rounded-full transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-sm text-text-primary uppercase tracking-wider">
          {activeMealData?.nombre}
        </span>
        <button
          onClick={() => {
            const idx = template?.tiempos.findIndex(m => m.nombre === activeMealData?.nombre) ?? 0;
            if (template && idx < template.tiempos.length - 1) setActiveTab(template.tiempos[idx + 1].nombre);
          }}
          disabled={!template || template.tiempos.findIndex(m => m.nombre === activeMealData?.nombre) === (template.tiempos.length - 1)}
          className="p-2 text-text-secondary hover:text-salud-blue disabled:opacity-30 disabled:hover:text-text-secondary rounded-full transition-colors cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Active Meal Section */}
      {activeMealData && (
        <MealSection
          meal={activeMealData}
          condiciones={condicionesPaciente}
          selectedDate={selectedDate}
          onComplete={handleMealComplete}
        />
      )}
    </div>
  );
}
