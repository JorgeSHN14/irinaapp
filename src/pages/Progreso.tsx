import { usePatient } from '../App';
import EmptyPatientState from '../components/patient/EmptyPatientState';
import Card from '../components/ui/Card';
import { TrendingUp, Scale, Droplets, CheckCircle, Info, Flame, UtensilsCrossed } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// =============================================
// Tooltip personalizado para kcal
// =============================================
function KcalTooltip({ active, payload, label, objetivo }: any) {
  if (!active || !payload || !payload.length) return null;
  const kcal = payload[0]?.value || 0;
  const margen = objetivo * 0.05;
  const ok = kcal >= objetivo - margen && kcal <= objetivo + margen;
  const excede = kcal > objetivo + margen;
  return (
    <div className="bg-bg-card border border-border/60 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-text-primary mb-1">{label}</p>
      <p className="font-bold" style={{ color: excede ? '#EF4444' : ok ? '#10B981' : '#2563EB' }}>
        {Math.round(kcal)} kcal consumidas
      </p>
      <p className="text-text-tertiary">Objetivo: {Math.round(objetivo)} kcal</p>
      {ok && <p className="text-salud-green font-semibold">✓ Dentro del objetivo (±5%)</p>}
      {excede && <p className="text-salud-red font-semibold">⚠ Excede el objetivo</p>}
      {!ok && !excede && kcal > 0 && <p className="text-salud-amber font-semibold">Por debajo del objetivo</p>}
    </div>
  );
}

export default function Progreso() {
  const { state } = usePatient();
  const { evaluacion, resultados } = state;

  if (!evaluacion || !resultados) {
    return <EmptyPatientState />;
  }

  const historial = state.historialConsultas || [];
  const pesoData = historial.length > 0
    ? historial.map((h, i) => ({ semana: `Eval ${i + 1}`, peso: h.pesoKg }))
    : [{ semana: 'Actual', peso: evaluacion.pesoKg }];

  const pesoInicial = pesoData[0].peso;
  const pesoActual = pesoData[pesoData.length - 1].peso;
  const diferencia = pesoData.length > 1 ? pesoActual - pesoInicial : 0;

  const objetivoKcal = resultados.get;
  const margenKcal = objetivoKcal * 0.05;

  // Generar datos de los últimos 7 días
  const historyData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = format(d, 'EEE', { locale: es });

    const log = state.diario?.[dateStr];
    const agua = log?.hidratacionMl || 0;
    const comidas = log?.comidasRegistradas ? Object.keys(log.comidasRegistradas).length : 0;

    // Kcal consumidas: suma de todas las comidas del día con kcalConsumidas
    const kcal = log?.comidasRegistradas
      ? Object.values(log.comidasRegistradas).reduce((acc, c) => acc + (c.kcalConsumidas || 0), 0)
      : 0;

    const dentroObjetivo = kcal > 0 && kcal >= objetivoKcal - margenKcal && kcal <= objetivoKcal + margenKcal;
    const excede = kcal > objetivoKcal + margenKcal;

    return {
      fecha: dateStr,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      agua,
      comidas,
      kcal,
      dentroObjetivo,
      excede,
    };
  });

  // Estadísticas de adherencia calórica
  const diasConRegistro = historyData.filter(d => d.kcal > 0);
  const diasEnObjetivo = historyData.filter(d => d.dentroObjetivo).length;
  const adherenciaPct = diasConRegistro.length > 0 ? Math.round((diasEnObjetivo / diasConRegistro.length) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
          <TrendingUp size={24} className="text-salud-blue" />
          Tu Progreso
        </h1>
        <p className="text-text-secondary mt-1">Seguimiento semanal de peso y nutrición</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <Card padding="sm" className="text-center">
          <p className="text-xs text-text-secondary mb-1">Inicio</p>
          <p className="text-lg font-extrabold text-text-primary">{pesoInicial}</p>
          <p className="text-xs text-text-tertiary">kg</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-text-secondary mb-1">Actual</p>
          <p className="text-lg font-extrabold text-salud-blue">{pesoActual}</p>
          <p className="text-xs text-text-tertiary">kg</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-text-secondary mb-1">Cambio</p>
          <p className={`text-lg font-extrabold ${diferencia < 0 ? 'text-salud-green' : 'text-salud-red'}`}>
            {diferencia > 0 ? '+' : ''}{diferencia.toFixed(1)}
          </p>
          <p className="text-xs text-text-tertiary">kg</p>
        </Card>
      </div>

      {/* ── Consumo Calórico Diario ── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-salud-amber" />
            <h2 className="font-bold text-text-primary">Consumo Calórico (7 Días)</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Objetivo diario</p>
            <p className="text-sm font-extrabold text-salud-blue">{Math.round(objetivoKcal)} kcal</p>
          </div>
        </div>

        {/* Estadística rápida */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-1 rounded-xl p-2.5 text-center border ${adherenciaPct >= 80 ? 'bg-salud-green-soft/20 border-salud-green/20' : 'bg-bg-elevated border-border/40'}`}>
            <p className={`text-lg font-extrabold ${adherenciaPct >= 80 ? 'text-salud-green' : 'text-text-primary'}`}>{adherenciaPct}%</p>
            <p className="text-[11px] text-text-secondary font-medium">Adherencia calórica</p>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center bg-bg-elevated border border-border/40">
            <p className="text-lg font-extrabold text-salud-amber">{diasConRegistro.length}</p>
            <p className="text-[11px] text-text-secondary font-medium">Días con registro</p>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center bg-bg-elevated border border-border/40">
            <p className="text-lg font-extrabold text-salud-blue">{diasEnObjetivo}</p>
            <p className="text-[11px] text-text-secondary font-medium">Días en objetivo</p>
          </div>
        </div>

        <div className="h-[220px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<KcalTooltip objetivo={objetivoKcal} />} />
              {/* Línea de objetivo */}
              <ReferenceLine
                y={objetivoKcal}
                stroke="#2563EB"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{ value: 'Objetivo', position: 'insideTopRight', fontSize: 10, fill: '#2563EB', fontWeight: 700 }}
              />
              {/* Zona de margen ±5% */}
              <ReferenceLine y={objetivoKcal + margenKcal} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={Math.max(0, objetivoKcal - margenKcal)} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1} />
              <Bar dataKey="kcal" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {historyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.kcal === 0 ? '#E5E7EB' : entry.excede ? '#EF4444' : entry.dentroObjetivo ? '#10B981' : '#3B82F6'}
                    fillOpacity={entry.kcal === 0 ? 0.4 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-text-tertiary font-semibold">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-salud-green inline-block" />En objetivo (±5%)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-salud-blue inline-block" />Por debajo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-salud-red inline-block" />Excede objetivo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-border inline-block opacity-60" />Sin registro</span>
        </div>
      </Card>

      {/* ── Detalle diario de comidas ── */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <UtensilsCrossed size={16} className="text-salud-green" />
          <h2 className="font-bold text-text-primary text-sm">Detalle de Comidas — Últimos 7 Días</h2>
        </div>
        <div className="space-y-2">
          {[...historyData].reverse().map(d => {
            if (d.comidas === 0 && d.kcal === 0) return null;
            const log = state.diario?.[d.fecha]?.comidasRegistradas || {};
            return (
              <div key={d.fecha} className="rounded-xl border border-border/40 bg-bg-elevated/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-text-primary capitalize">{d.label} {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                  <div className="flex items-center gap-2">
                    {d.kcal > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.dentroObjetivo ? 'bg-salud-green-soft/30 text-salud-green' : d.excede ? 'bg-salud-red-soft/30 text-salud-red' : 'bg-salud-blue-soft/20 text-salud-blue'}`}>
                        {Math.round(d.kcal)} kcal
                      </span>
                    )}
                    <span className="text-xs text-text-tertiary">{d.comidas} comidas</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(log).map((comida, i) => (
                    <div key={i} className="flex items-center gap-1 bg-bg-card border border-border/40 rounded-lg px-2 py-1">
                      <CheckCircle size={10} className="text-salud-green" />
                      <span className="text-[11px] text-text-secondary font-medium">{comida.nombreComida}</span>
                      {comida.recetaSeleccionadaNombre && (
                        <span className="text-[10px] text-text-tertiary">· {comida.recetaSeleccionadaNombre.substring(0, 20)}{comida.recetaSeleccionadaNombre.length > 20 ? '…' : ''}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {historyData.every(d => d.comidas === 0) && (
            <div className="text-center py-6">
              <UtensilsCrossed size={32} className="text-text-tertiary mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-tertiary">Aún no hay comidas registradas esta semana.</p>
              <p className="text-xs text-text-tertiary mt-1">Ve a "Menú del Día" para registrar tus comidas.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Weight chart */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className="text-salud-blue" />
          <h2 className="font-bold text-text-primary">Evolución de Peso</h2>
        </div>
        <div className="h-[250px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pesoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="semana" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '14px', fontWeight: '600' }}
                formatter={(value) => [`${value} kg`, 'Peso']}
              />
              <Line type="monotone" dataKey="peso" stroke="#2563EB" strokeWidth={3} dot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#2563EB', stroke: '#DBEAFE', strokeWidth: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Info note */}
      <Card className="delay-3 bg-bg-elevated/50 border-border/40">
        <div className="flex gap-3">
          <Info size={20} className="text-text-tertiary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary leading-relaxed">
            La gráfica de peso es de solo lectura. Tu progreso corporal y medidas son registrados <strong>exclusivamente por tu médico o nutriólogo</strong> durante tus consultas en la clínica.
          </p>
        </div>
      </Card>

      {/* Gráfico de Hidratación */}
      <Card padding="lg" className="delay-2">
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={18} className="text-salud-blue" />
          <h2 className="font-bold text-text-primary">Consumo de Agua (7 Días)</h2>
        </div>
        <div className="h-[200px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                cursor={{ fill: '#DBEAFE', opacity: 0.4 }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value) => [`${value} ml`, 'Agua']}
              />
              <Bar dataKey="agua" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Gráfico de Adherencia (Comidas) */}
      <Card padding="lg" className="delay-3">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={18} className="text-salud-green" />
          <h2 className="font-bold text-text-primary">Comidas Completadas (7 Días)</h2>
        </div>
        <div className="h-[200px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorComidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value) => [`${value} comidas`, 'Completadas']}
              />
              <Area type="monotone" dataKey="comidas" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorComidas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
