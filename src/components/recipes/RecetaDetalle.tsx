import { ArrowLeft, ChefHat, Clock, Heart, Star, Users, Trash2, Sparkles } from 'lucide-react';
import Card from '../ui/Card';
import type { Receta } from '../../types';
import { getCategoriaEmoji, getCategoriaLabel, getDificultadLabel, getRestriccionLabel, getTagLabel } from '../../utils/recetaEngine';

interface RecetaDetalleProps {
  receta: Receta;
  onClose: () => void;
  onToggleFav?: () => void;
  isFav?: boolean;
  onRate?: (rating: number) => void;
  currentRating?: number;
  onDelete?: () => void;
}

export default function RecetaDetalle({ receta, onClose, onToggleFav, isFav = false, onRate, currentRating = 0, onDelete }: RecetaDetalleProps) {
  const macros: any = receta.macros_por_porcion || receta.macrosPorPorcion || { kcal: 0, prot: 0, cho: 0, grasas: 0 };
  const tiempo = receta.tiempo_preparacion_min || receta.tiempoPreparacionMin || 0;
  const rinde = receta.porciones_rinde || receta.porcionesRinde || 1;
  const avanzados: any = receta.datos_nutricionales_avanzados || receta.datosNutricionalesAvanzados || {};
  const aptaParaDietas = avanzados.apta_para_dietas || avanzados.aptaParaDietas || [];
  const alergenos = avanzados.alergenos || [];
  const vitaminas = avanzados.vitaminas || [];
  const cargaGlicemica = avanzados.carga_glicemica || avanzados.cargaGlicemica || '';
  const aptaPara = receta.apta_para_condiciones || receta.aptaParaCondiciones || [];
  
  return (
    <div className="animate-fade-in pb-12">
      {/* Header and Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-bg-elevated transition-colors cursor-pointer"
        >
          <ArrowLeft size={22} className="text-text-secondary hover:text-text-primary" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-salud-blue bg-salud-blue-soft/50 px-2.5 py-1 rounded-full">
              {getCategoriaEmoji(receta.categoria)} {getCategoriaLabel(receta.categoria)}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              receta.dificultad === 'facil' ? 'bg-salud-green-soft text-salud-green' :
              receta.dificultad === 'media' ? 'bg-salud-amber-soft text-salud-amber' :
              'bg-salud-red-soft text-salud-red'
            }`}>
              {getDificultadLabel(receta.dificultad)}
            </span>
            {receta.origen === 'ia' && (
              <span className="text-[10px] font-extrabold bg-gradient-to-r from-salud-blue to-salud-green text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                <Sparkles size={12} /> Generada por IA ✨
              </span>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary">{receta.nombre}</h1>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="p-3 bg-bg-elevated rounded-full hover:bg-salud-red-soft/80 text-text-tertiary hover:text-salud-red transition-colors cursor-pointer border border-border/40"
              title="Eliminar receta generada por IA"
            >
              <Trash2 size={24} />
            </button>
          )}
          {onToggleFav && (
            <button
              onClick={onToggleFav}
              className="p-3 bg-bg-elevated rounded-full hover:bg-salud-red-soft/50 transition-colors cursor-pointer border border-border/40"
            >
              <Heart size={24} className={isFav ? 'fill-salud-red text-salud-red' : 'text-text-tertiary hover:text-salud-red'} />
            </button>
          )}
        </div>
      </div>

      <p className="text-text-secondary text-sm lg:text-base mb-6 max-w-3xl">{receta.descripcion}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-6 mb-8 bg-bg-card p-4 rounded-[var(--radius-lg)] border border-border/40 inline-flex">
        <span className="flex items-center gap-2 text-text-primary font-bold">
          <Clock size={20} className="text-salud-blue" /> {tiempo} min
        </span>
        <span className="w-px h-6 bg-border/60 hidden sm:block"></span>
        <span className="flex items-center gap-2 text-text-primary font-bold">
          <Users size={20} className="text-salud-green" /> {rinde} {rinde === 1 ? 'porción' : 'porciones'}
        </span>
      </div>

      {/* Grid Layout for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column (Macros & Ingredients) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Macros card */}
          <Card padding="md" className="bg-gradient-to-br from-salud-blue-soft/30 to-salud-green-soft/30 border-salud-blue/10">
            <p className="text-xs font-bold text-salud-blue mb-3 uppercase tracking-wider">Macronutrientes por porción</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/60 p-2 rounded-[var(--radius-sm)] border border-border/30">
                <p className="text-lg lg:text-xl font-extrabold text-salud-red">{macros.kcal}</p>
                <p className="text-[10px] text-text-tertiary font-bold uppercase">Kcal</p>
              </div>
              <div className="bg-white/60 p-2 rounded-[var(--radius-sm)] border border-border/30">
                <p className="text-lg lg:text-xl font-extrabold text-salud-blue">{macros.prot}g</p>
                <p className="text-[10px] text-text-tertiary font-bold uppercase">Prot</p>
              </div>
              <div className="bg-white/60 p-2 rounded-[var(--radius-sm)] border border-border/30">
                <p className="text-lg lg:text-xl font-extrabold text-salud-amber">{macros.cho}g</p>
                <p className="text-[10px] text-text-tertiary font-bold uppercase">Carbs</p>
              </div>
              <div className="bg-white/60 p-2 rounded-[var(--radius-sm)] border border-border/30">
                <p className="text-lg lg:text-xl font-extrabold text-text-primary">{macros.grasas}g</p>
                <p className="text-[10px] text-text-tertiary font-bold uppercase">Grasas</p>
              </div>
            </div>
            {(macros.fibra || macros.sodio) && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-salud-blue/10 text-xs text-text-secondary font-medium">
                {macros.fibra && <span>Fibra: <b className="text-text-primary">{macros.fibra}g</b></span>}
                {macros.sodio && <span>Sodio: <b className="text-text-primary">{macros.sodio}mg</b></span>}
              </div>
            )}
          </Card>

          {/* Ingredientes */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
              <ChefHat size={20} className="text-salud-green" /> Ingredientes
            </h3>
            <ul className="space-y-3">
              {(receta.ingredientes || []).map((ing: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm group">
                  <span className="w-2 h-2 rounded-full bg-salud-green mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
                  <span className="text-text-primary leading-relaxed">
                    <b className="text-salud-blue">{ing.cantidad} {ing.unidad}</b> {ing.nombre}
                    {ing.racionesSmae && (
                      <span className="block text-[11px] text-text-tertiary mt-0.5 font-medium">({ing.racionesSmae} raciones SMAE)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column (Instructions & Meta) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Instrucciones */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-text-primary mb-4 border-b border-border/40 pb-3">
              📝 Instrucciones de Preparación
            </h3>
            <ol className="space-y-5">
              {(receta.instrucciones || []).map((paso: string, idx: number) => (
                <li key={idx} className="flex gap-4 text-sm group">
                  <span className="w-8 h-8 rounded-full bg-salud-blue-soft text-salud-blue text-sm font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-salud-blue group-hover:text-white transition-colors">
                    {idx + 1}
                  </span>
                  <p className="text-text-secondary leading-relaxed pt-1.5 text-base">{paso}</p>
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Restricciones y Tags */}
            <Card padding="md">
              <p className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider">Etiquetas y Clínico</p>
              <div className="flex flex-wrap gap-2">
                {/* Patologías Recomendadas */}
                {aptaPara && aptaPara.length > 0 && !aptaPara.includes('General') && !aptaPara.includes('Salud General') && !aptaPara.includes('general') ? (
                  aptaPara.map((cond: string) => (
                    <span key={cond} className="text-xs font-bold bg-salud-red-soft border border-salud-red/20 text-salud-red px-2.5 py-1 rounded-md flex items-center gap-1">
                      ❤️ Recom. para: {cond}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-bold bg-salud-green-soft border border-salud-green/20 text-salud-green px-2.5 py-1 rounded-md flex items-center gap-1">
                    ✓ Apto para: General
                  </span>
                )}

                {/* Carga Glicémica */}
                {cargaGlicemica && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                    cargaGlicemica === 'baja' ? 'bg-salud-green-soft border-salud-green/20 text-salud-green' :
                    cargaGlicemica === 'media' ? 'bg-salud-amber-soft border-salud-amber/20 text-salud-amber' :
                    'bg-salud-red-soft border-salud-red/20 text-salud-red'
                  }`}>
                    IG: {cargaGlicemica.toUpperCase()}
                  </span>
                )}
                
                {/* Alérgenos */}
                {alergenos.length > 0 && (
                  <span className="text-xs font-bold bg-salud-red-soft/30 border border-salud-red/20 text-salud-red px-2.5 py-1 rounded-md">
                    ⚠️ Contiene: {alergenos.join(', ')}
                  </span>
                )}

                {/* Vitaminas Clave */}
                {vitaminas.length > 0 && (
                  <span className="text-xs font-bold bg-salud-blue-soft border border-salud-blue/20 text-salud-blue px-2.5 py-1 rounded-md">
                    ✨ {vitaminas.join(', ')}
                  </span>
                )}

                {/* Dietas */}
                {aptaParaDietas.map((d: string) => (
                  <span key={d} className="text-xs font-bold bg-salud-purple-soft border border-salud-purple/20 text-salud-purple px-2.5 py-1 rounded-md">
                    🌿 {d}
                  </span>
                ))}

                {(receta.restricciones || []).map(r => (
                  <span key={r} className="text-xs font-bold bg-bg-elevated border border-border/40 text-text-primary px-2.5 py-1 rounded-md">
                    ✓ {getRestriccionLabel(r)}
                  </span>
                ))}
                {(receta.tags || []).map(t => (
                  <span key={t} className="text-xs font-semibold bg-bg-elevated border border-border/40 text-text-secondary px-2.5 py-1 rounded-md">
                    {getTagLabel(t)}
                  </span>
                ))}
              </div>
            </Card>

            {/* Calificación */}
            {onRate && (
              <Card padding="md" className="flex flex-col justify-center items-center text-center">
                <p className="text-sm font-bold text-text-primary mb-3">¿Qué te pareció esta receta?</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => onRate(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125 hover:-translate-y-1"
                    >
                      <Star
                        size={32}
                        className={star <= currentRating ? 'fill-salud-amber text-salud-amber' : 'text-text-tertiary'}
                      />
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
