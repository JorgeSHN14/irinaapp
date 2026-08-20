import { Target, TrendingDown, TrendingUp, Armchair, Footprints, Bike, Dumbbell, Flame } from 'lucide-react';
import Input from '../ui/Input';
import type { NivelActividad, SystemOption } from '../../types';
import { NIVELES_ACTIVIDAD } from '../../utils/constants';
import { useSystemOptions } from '../../contexts/SystemOptionsContext';

interface StepObjetivoProps {
  objetivo: string[];
  nivelActividad: NivelActividad | 0;
  motivacion: string;
  apoyoFamiliar: boolean;
  onUpdate: (field: string, value: any) => void;
}


const actividadIconos: Record<string, typeof Armchair> = {
  Armchair,
  Walk: Footprints,
  Bike,
  Dumbbell,
  Flame,
};

export default function StepObjetivo({ objetivo, nivelActividad, motivacion, apoyoFamiliar, onUpdate }: StepObjetivoProps) {
  const { getOptionsByCategory } = useSystemOptions();
  const dbObjetivos = getOptionsByCategory('objetivo');
  
  const fallbackObjetivos: SystemOption[] = [
    { id: 'f1', valor: 'Perder peso', descripcion: 'Reducción de porcentaje de grasa corporal', categoria: 'objetivo', activo: true },
    { id: 'f2', valor: 'Mantener peso', descripcion: 'Mantenimiento y recomposición', categoria: 'objetivo', activo: true },
    { id: 'f3', valor: 'Ganar masa muscular', descripcion: 'Aumento de volumen y peso', categoria: 'objetivo', activo: true },
  ];

  const objetivosDinamicos = dbObjetivos.length > 0 ? dbObjetivos : fallbackObjetivos;
  
  return (
    <div className="space-y-6 animate-slide-right">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Tu Objetivo</h2>
        <p className="text-text-secondary">Define tu meta y nivel de actividad física</p>
      </div>

      {/* Objetivo - Tarjetas descriptivas */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          ¿Cuál es tu objetivo principal?
        </label>
        <div className="space-y-3">
          {objetivosDinamicos.map((opcion) => {
            const isActive = objetivo.includes(opcion.valor);
            const fallbackIcon = opcion.valor.toLowerCase().includes('perder') ? TrendingDown : 
                                 opcion.valor.toLowerCase().includes('ganar') ? TrendingUp : Target;
            const Icon = fallbackIcon;
            
            const handleToggle = () => {
              if (isActive) {
                onUpdate('objetivo', objetivo.filter(o => o !== opcion.valor));
              } else {
                onUpdate('objetivo', [...objetivo, opcion.valor]);
              }
            };
            
            return (
              <button
                key={opcion.id}
                type="button"
                onClick={handleToggle}
                className={`
                  w-full flex items-center gap-4 p-4
                  rounded-[var(--radius-lg)] border-2
                  text-left transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'border-salud-blue bg-salud-blue-soft shadow-md'
                    : 'border-border bg-bg-card hover:border-salud-blue/30'
                  }
                `}
                aria-pressed={isActive}
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl
                    ${isActive ? 'bg-salud-blue text-white' : 'bg-bg-elevated text-text-secondary'}
                    transition-colors duration-200
                  `}
                >
                  {opcion.icono ? opcion.icono : <Icon size={24} />}
                </div>
                <div>
                  <p className={`font-bold text-base ${isActive ? 'text-salud-blue' : 'text-text-primary'}`}>
                    {opcion.valor}
                  </p>
                  {opcion.descripcion && (
                    <p className="text-sm text-text-secondary">{opcion.descripcion}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nivel de actividad - Tarjetas con iconos */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          Nivel de actividad física
        </label>
        <div className="space-y-2">
          {NIVELES_ACTIVIDAD.map(({ nivel, nombre, descripcion, icono }) => {
            const isActive = nivelActividad === nivel;
            const Icon = actividadIconos[icono] || Armchair;
            return (
              <button
                key={nivel}
                type="button"
                onClick={() => onUpdate('nivelActividad', nivel)}
                className={`
                  w-full flex items-center gap-3 p-3
                  rounded-[var(--radius-md)] border-2
                  text-left transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'border-salud-green bg-salud-green-soft shadow-sm'
                    : 'border-border bg-bg-card hover:border-salud-green/30'
                  }
                `}
                aria-pressed={isActive}
              >
                <div
                  className={`
                    w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0
                    ${isActive ? 'bg-salud-green text-white' : 'bg-bg-elevated text-text-secondary'}
                    transition-colors duration-200
                  `}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isActive ? 'text-salud-green' : 'text-text-primary'}`}>
                    {nombre}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{descripcion}</p>
                </div>
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    text-xs font-bold flex-shrink-0
                    ${isActive ? 'bg-salud-green text-white' : 'bg-bg-elevated text-text-tertiary'}
                  `}
                >
                  {nivel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Motivación y Apoyo Familiar */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          Factores Psicosociales
        </label>
        <div className="space-y-3">
          <Input 
            type="text" 
            placeholder="¿Qué te motiva a mejorar tu salud?" 
            value={motivacion} 
            onChange={(e) => onUpdate('motivacion', e.target.value)}
          />
          <label className="flex items-center gap-3 p-3 border-2 border-border rounded-[var(--radius-md)] bg-bg-card cursor-pointer transition-colors hover:border-salud-blue/30">
            <input 
              type="checkbox" 
              checked={apoyoFamiliar}
              onChange={(e) => onUpdate('apoyoFamiliar', e.target.checked)}
              className="w-5 h-5 accent-salud-blue cursor-pointer"
            />
            <span className="text-sm font-semibold text-text-primary">Cuento con apoyo familiar en casa</span>
          </label>
        </div>
      </div>
    </div>
  );
}
