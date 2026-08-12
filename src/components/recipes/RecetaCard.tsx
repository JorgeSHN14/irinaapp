import { Clock, Flame, Heart, Trash2, Sparkles } from 'lucide-react';
import Card from '../ui/Card';
import type { Receta } from '../../types';
import { getCategoriaEmoji, getCategoriaLabel, getTagLabel } from '../../utils/recetaEngine';

interface RecetaCardProps {
  receta: Receta;
  onSelect: () => void;
  onToggleFav?: () => void;
  isFav?: boolean;
  onDelete?: () => void;
}

export default function RecetaCard({ receta, onSelect, onToggleFav, isFav = false, onDelete }: RecetaCardProps) {
  return (
    <Card padding="sm" className="cursor-pointer hover:border-salud-blue/30 transition-all group relative">
      <div onClick={onSelect}>
        {/* Header con categoría y dificultad */}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-salud-blue bg-salud-blue-soft/50 px-2 py-0.5 rounded-full">
              {getCategoriaEmoji(receta.categoria)} {getCategoriaLabel(receta.categoria)}
            </span>
            {(() => {
              const aptaPara = receta.apta_para_condiciones || receta.aptaParaCondiciones || [];
              if (aptaPara.length > 0 && !aptaPara.includes('General') && !aptaPara.includes('Salud General') && !aptaPara.includes('general')) {
                return (
                  <span className="text-[10px] font-extrabold bg-salud-red-soft text-salud-red px-2 py-0.5 rounded-full">
                    ❤️ {aptaPara[0]}
                  </span>
                );
              } else {
                return (
                  <span className="text-[10px] font-extrabold bg-salud-green-soft text-salud-green px-2 py-0.5 rounded-full">
                    ✓ General
                  </span>
                );
              }
            })()}
          </div>
          {receta.origen === 'ia' && (
            <span className="text-[10px] font-extrabold bg-gradient-to-r from-salud-blue to-salud-green text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
              <Sparkles size={10} /> IA ✨
            </span>
          )}
        </div>

        {/* Nombre */}
        <h3 className="font-bold text-text-primary text-base leading-tight mb-1 group-hover:text-salud-blue transition-colors">
          {receta.nombre}
        </h3>
        <p className="text-xs text-text-secondary line-clamp-2 mb-3">{receta.descripcion}</p>

        {/* Macros rápidos */}
        <div className="flex items-center gap-3 text-[11px] font-semibold mb-2">
          <span className="flex items-center gap-1 text-salud-red">
            <Flame size={12} /> {receta.macros_por_porcion?.kcal || receta.macrosPorPorcion?.kcal} kcal
          </span>
          <span className="text-salud-blue">{receta.macros_por_porcion?.prot || receta.macrosPorPorcion?.prot}g P</span>
          <span className="text-salud-amber">{receta.macros_por_porcion?.cho || receta.macrosPorPorcion?.cho}g C</span>
          <span className="text-text-tertiary">{receta.macros_por_porcion?.grasas || receta.macrosPorPorcion?.grasas}g G</span>
        </div>

        {/* Tiempo y tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-text-tertiary font-medium">
            <Clock size={10} /> {receta.tiempo_preparacion_min || receta.tiempoPreparacionMin} min
          </span>
          {(receta.tags || []).slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] bg-bg-elevated text-text-secondary px-1.5 py-0.5 rounded font-medium">
              {getTagLabel(tag)}
            </span>
          ))}
        </div>
      </div>

      {/* Botones de acción superior derecha */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-full bg-bg-elevated/90 hover:bg-salud-red-soft/90 text-text-tertiary hover:text-salud-red transition-colors cursor-pointer border border-border/40 shadow-sm"
            title="Eliminar receta generada por IA"
          >
            <Trash2 size={15} />
          </button>
        )}
        {onToggleFav && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className="p-1.5 rounded-full bg-bg-elevated/90 hover:bg-salud-red-soft/90 transition-colors cursor-pointer border border-border/40 shadow-sm"
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={15} className={isFav ? 'fill-salud-red text-salud-red' : 'text-text-tertiary'} />
          </button>
        )}
      </div>
    </Card>
  );
}
