import { useState, useMemo, useEffect } from 'react';
import { usePatient } from '../App';
import { useSearchParams } from 'react-router-dom';
import EmptyPatientState from '../components/patient/EmptyPatientState';
import {
  Search, SlidersHorizontal, X, ChevronDown,
  ChefHat, ChevronRight, Sparkles
} from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import type { Receta, FiltrosReceta, CategoriaReceta } from '../types';
import {
  buscarRecetas, recomendarRecetasParaPaciente,
  CATEGORIAS_RECETA
} from '../utils/recetaEngine';
import { supabase } from '../lib/supabase';
import { useRecipeStore } from '../store/useRecipeStore';
import RecetaCard from '../components/recipes/RecetaCard';
import RecetaDetalle from '../components/recipes/RecetaDetalle';
import FiltrosAvanzados from '../components/recipes/FiltrosAvanzados';
import GeneradorIA from '../components/recipes/GeneradorIA';

export default function Recetas() {
  const { state, dispatch } = usePatient();
  const { evaluacion, resultados } = state;
  const { generatedRecipes, removeGeneratedRecipe } = useRecipeStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaFromUrl = searchParams.get('categoria') as CategoriaReceta | null;
  const recetaFromUrl = searchParams.get('receta');

  const [vistaActiva, setVistaActiva] = useState<'recetario' | 'ia'>('recetario');
  const [filtros, setFiltros] = useState<FiltrosReceta>({});
  const [searchText, setSearchText] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaReceta | null>(categoriaFromUrl);
  const [showFiltrosAvanzados, setShowFiltrosAvanzados] = useState(false);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<Receta | null>(null);
  const [showRecomendadas, setShowRecomendadas] = useState(true);

  const [catalogo, setCatalogo] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecetas() {
      const { data, error } = await supabase.from('recipes').select('*');
      if (!error && data) {
        setCatalogo(data as unknown as Receta[]);
      }
      setLoading(false);
    }
    fetchRecetas();

    const channel = supabase.channel('recipes-changes-patient')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes' },
        () => {
          fetchRecetas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Catálogo unificado fucionando las recetas de Supabase y las generadas por IA y persistidas en Zustand
  const catalogoUnificado = useMemo(() => {
    const genIds = new Set(generatedRecipes.map(r => r.id));
    const sysFiltered = catalogo.filter(r => !genIds.has(r.id));
    return [...generatedRecipes, ...sysFiltered];
  }, [generatedRecipes, catalogo]);

  useEffect(() => {
    if (recetaFromUrl && catalogoUnificado.length > 0 && !recetaSeleccionada) {
      const found = catalogoUnificado.find(r => r.id === recetaFromUrl);
      if (found) {
        setRecetaSeleccionada(found);
      }
    }
  }, [recetaFromUrl, catalogoUnificado, recetaSeleccionada]);

  const filtrosActivos = useMemo(() => {
    let count = 0;
    if (filtros.condicionMedica) count++;
    if (filtros.dificultad) count++;
    if (filtros.rangoKcal) count++;
    if (filtros.tiempoMaxMin) count++;
    if (filtros.restricciones?.length) count += filtros.restricciones.length;
    if (filtros.tags?.length) count += filtros.tags.length;
    return count;
  }, [filtros]);

  const recomendadas = useMemo(() => {
    if (!evaluacion || !resultados || !catalogoUnificado.length) return [];
    return recomendarRecetasParaPaciente(
      evaluacion, resultados,
      catalogoUnificado, state.recetasFavoritas, state.calificaciones
    ).slice(0, 6);
  }, [evaluacion, resultados, catalogoUnificado, state.recetasFavoritas, state.calificaciones]);

  const resultadosBusqueda = useMemo(() => {
    const filtrosCombinados: FiltrosReceta = {
      ...filtros,
      busqueda: searchText || undefined,
      categoria: categoriaActiva || undefined,
    };

    const hayFiltros = searchText || categoriaActiva || filtrosActivos > 0 || filtros.soloFavoritas;
    if (!hayFiltros) return null;

    return buscarRecetas(filtrosCombinados, catalogoUnificado, state.recetasFavoritas, state.calificaciones);
  }, [filtros, searchText, categoriaActiva, catalogoUnificado, state.recetasFavoritas, state.calificaciones, filtrosActivos]);

  const handleToggleFav = (id: string) => {
    dispatch({ type: 'TOGGLE_FAVORITA', payload: id });
  };

  const handleRate = (recetaId: string, calificacion: number) => {
    dispatch({ type: 'RATE_RECETA', payload: { recetaId, calificacion } });
  };

  const handleDeleteRecipe = async (r: Receta) => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar la receta "${r.nombre}"?`);
    if (!confirmDelete) return;

    if (r.origen === 'ia') {
      removeGeneratedRecipe(r.id);
    } else {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', r.id);

      if (error) {
        console.error('Error al eliminar la receta:', error.message);
        alert('No se pudo eliminar la receta: ' + error.message);
      } else {
        alert('Receta eliminada con éxito.');
        setCatalogo(prev => prev.filter(item => item.id !== r.id));
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text-secondary">Cargando recetas...</div>;
  }

  if (!evaluacion || !resultados) {
    return <EmptyPatientState />;
  }

  if (recetaSeleccionada) {
    return (
      <div className="animate-fade-in">
        <RecetaDetalle
          receta={recetaSeleccionada}
          onClose={() => {
            setRecetaSeleccionada(null);
            // Si veníamos de la URL con receta, quitamos el param al cerrar para que no se reabra
            if (recetaFromUrl) {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('receta');
              setSearchParams(newParams, { replace: true });
            }
          }}
          onToggleFav={() => handleToggleFav(recetaSeleccionada.id)}
          isFav={state.recetasFavoritas.includes(recetaSeleccionada.id)}
          onRate={(r) => handleRate(recetaSeleccionada.id, r)}
          currentRating={state.calificaciones[recetaSeleccionada.id] || 0}
          onDelete={() => {
            const selected = recetaSeleccionada;
            setRecetaSeleccionada(null);
            handleDeleteRecipe(selected);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
            <ChefHat size={26} className="text-salud-green" />
            Recetas Nutricionales
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Encuentra recetas o genera menús clínicos adaptados con Inteligencia Artificial
          </p>
        </div>

        {/* Pestañas de Navegación (Recetario General vs Generador IA) */}
        <div className="flex bg-bg-card p-1 rounded-[var(--radius-lg)] border border-border/60 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => { setVistaActiva('recetario'); setRecetaSeleccionada(null); }}
            className={`py-2 px-4 rounded-[var(--radius-md)] text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              vistaActiva === 'recetario'
                ? 'bg-salud-blue text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <ChefHat size={16} /> Recetario ({catalogoUnificado.length})
          </button>
          <button
            onClick={() => { setVistaActiva('ia'); setRecetaSeleccionada(null); }}
            className={`py-2 px-4 rounded-[var(--radius-md)] text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              vistaActiva === 'ia'
                ? 'bg-gradient-to-r from-salud-blue via-salud-green to-salud-blue bg-[length:200%_100%] animate-gradient text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Sparkles size={16} className="animate-pulse" /> Generador IA ✨
          </button>
        </div>
      </div>

      {/* Vista Activa: Generador IA */}
      {vistaActiva === 'ia' ? (
        <GeneradorIA onRecipeSaved={() => { setVistaActiva('recetario'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      ) : (
        /* Vista Activa: Recetario General */
        <div className="space-y-5 animate-fade-in">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Buscar por nombre, ingrediente..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                icon={<Search size={18} />}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-primary cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFiltrosAvanzados(true)}
              className={`px-3 py-2 rounded-[var(--radius-md)] border-2 transition-colors cursor-pointer relative ${
                filtrosActivos > 0
                  ? 'border-salud-blue bg-salud-blue-soft text-salud-blue'
                  : 'border-border bg-bg-card text-text-secondary hover:border-salud-blue/30'
              }`}
            >
              <SlidersHorizontal size={20} />
              {filtrosActivos > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-salud-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {filtrosActivos}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={categoriaActiva || ''}
              onChange={(e) => setCategoriaActiva(e.target.value as CategoriaReceta || null)}
              className="flex-1 h-[40px] px-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg-card text-text-primary text-sm font-medium focus:border-salud-blue focus:ring-2 focus:ring-salud-blue/20 outline-none transition-all cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS_RECETA.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setFiltros(prev => ({ ...prev, soloFavoritas: !prev.soloFavoritas }))}
              className={`h-[40px] px-4 rounded-[var(--radius-md)] text-sm font-bold transition-colors cursor-pointer border flex items-center justify-center gap-1.5 ${
                filtros.soloFavoritas
                  ? 'bg-salud-red-soft text-salud-red border-salud-red/50'
                  : 'bg-bg-card text-text-secondary border-border hover:border-salud-red/30 hover:text-salud-red'
              }`}
              title="Ver Favoritas"
            >
              ❤️ <span className="hidden sm:inline">Favoritas</span>
            </button>
          </div>

          {resultadosBusqueda !== null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-text-secondary">
                  {resultadosBusqueda.length} receta{resultadosBusqueda.length !== 1 ? 's' : ''} encontrada{resultadosBusqueda.length !== 1 ? 's' : ''}
                </p>
                {(searchText || categoriaActiva || filtrosActivos > 0) && (
                  <button
                    onClick={() => { setSearchText(''); setCategoriaActiva(null); setFiltros({}); }}
                    className="text-xs text-salud-blue font-bold cursor-pointer hover:underline"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              {resultadosBusqueda.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-4xl mb-2">🔍</p>
                  <p className="text-text-secondary font-medium">No se encontraron recetas con estos filtros.</p>
                  <p className="text-text-tertiary text-sm mt-1">Intenta con otros criterios o genera una con IA.</p>
                  <button
                    onClick={() => setVistaActiva('ia')}
                    className="mt-4 px-4 py-2 bg-salud-blue text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sparkles size={14} /> Crear receta con IA
                  </button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {resultadosBusqueda.map(receta => (
                    <RecetaCard
                      key={receta.id}
                      receta={receta}
                      onSelect={() => setRecetaSeleccionada(receta)}
                      onToggleFav={() => handleToggleFav(receta.id)}
                      isFav={state.recetasFavoritas.includes(receta.id)}
                      onDelete={() => handleDeleteRecipe(receta)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <button
                  onClick={() => setShowRecomendadas(!showRecomendadas)}
                  className="flex items-center justify-between w-full mb-3 cursor-pointer group"
                >
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2 group-hover:text-salud-blue transition-colors">
                    ✨ Recomendadas para Ti
                  </h2>
                  <ChevronDown
                    size={20}
                    className={`text-text-tertiary transition-transform duration-300 ${showRecomendadas ? 'rotate-180' : ''}`}
                  />
                </button>

                {showRecomendadas && (
                  <>
                    <p className="text-xs text-text-secondary mb-3">
                      Basadas en tu perfil: {evaluacion.condiciones.filter(c => c !== 'ninguno').join(', ') || 'Sin condiciones clínicas restrictivas'}
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {recomendadas.map(receta => (
                        <RecetaCard
                          key={receta.id}
                          receta={receta}
                          onSelect={() => setRecetaSeleccionada(receta)}
                          onToggleFav={() => handleToggleFav(receta.id)}
                          isFav={state.recetasFavoritas.includes(receta.id)}
                          onDelete={() => handleDeleteRecipe(receta)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-text-primary mb-3">📂 Explorar por Categoría</h2>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIAS_RECETA.map(cat => {
                    const count = buscarRecetas(
                      { categoria: cat.value },
                      catalogoUnificado, state.recetasFavoritas, state.calificaciones
                    ).length;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => { setCategoriaActiva(cat.value); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="bg-bg-card rounded-[var(--radius-lg)] border border-border/40 p-4 flex items-center gap-3 hover:border-salud-blue/50 transition-colors text-left w-full group cursor-pointer shadow-xs"
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-text-primary text-sm group-hover:text-salud-blue transition-colors">{cat.label}</p>
                          <p className="text-[11px] text-text-tertiary">{count} recetas</p>
                        </div>
                        <ChevronRight size={16} className="text-text-tertiary group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showFiltrosAvanzados && (
            <FiltrosAvanzados
              filtros={filtros}
              onUpdate={setFiltros}
              onClose={() => setShowFiltrosAvanzados(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
