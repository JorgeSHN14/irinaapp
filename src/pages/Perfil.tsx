import { useState } from 'react';
import { usePatient } from '../App';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { HeartPulse, LogOut, Info, FileText, Pill, Activity, TrendingDown, UserCircle, Lock, Eye, EyeOff, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

function WeightChart({ data }: { data: any[] }) {
  if (!data || data.length < 2) return null;
  
  // Filtrar los que tienen pesoKg
  const validData = data.filter(d => d.pesoKg);
  if (validData.length < 2) return null;

  const minWeight = Math.min(...validData.map(d => d.pesoKg)) - 2;
  const maxWeight = Math.max(...validData.map(d => d.pesoKg)) + 2;
  
  const points = validData.map((d, i) => {
    const x = (i / (validData.length - 1)) * 100;
    const y = 100 - ((d.pesoKg - minWeight) / (maxWeight - minWeight)) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-bg-elevated p-4 rounded-[var(--radius-md)] mb-4 border border-border/40">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-bold text-salud-blue uppercase tracking-wider flex items-center gap-1">
          <TrendingDown size={14} /> Progreso de Peso
        </p>
        <div className="text-right">
          <p className="text-sm font-bold text-text-primary">{validData[validData.length - 1].pesoKg} kg</p>
          <p className="text-[10px] text-text-secondary">Actual</p>
        </div>
      </div>
      
      <div className="relative w-full h-24 mb-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-border" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-border" strokeDasharray="2,2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-border" />
          
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-salud-blue drop-shadow-sm"
          />
          {validData.map((d, i) => {
            const x = (i / (validData.length - 1)) * 100;
            const y = 100 - ((d.pesoKg - minWeight) / (maxWeight - minWeight)) * 100;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3" fill="white" stroke="currentColor" strokeWidth="1.5" className="text-salud-blue" />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] font-bold text-text-tertiary">
        <span>{new Date(validData[0].fecha).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(validData[validData.length - 1].fecha).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

// =============================================
// Historial Clínico Desplegable — Paciente
// =============================================
const PAGE_SIZE = 3;

function HistorialClinico({ consultas }: { consultas: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Ordenar de más reciente a más antiguo
  const sorted = [...consultas].reverse();
  const total = sorted.length;
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < total;

  const handleOpen = () => {
    setIsOpen(true);
    setVisibleCount(PAGE_SIZE);
  };

  const handleCollapse = () => {
    setIsOpen(false);
    setVisibleCount(PAGE_SIZE);
  };

  const handleVerMas = () => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, total));
  };

  return (
    <Card className="space-y-0 overflow-hidden">
      {/* Cabecera — siempre visible */}
      <button
        onClick={isOpen ? handleCollapse : handleOpen}
        className="w-full flex items-center justify-between p-4 group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-salud-blue" />
          <h2 className="text-base font-bold text-text-primary">Mi Historial Clínico</h2>
          <span className="text-xs font-bold bg-salud-blue/10 text-salud-blue px-2 py-0.5 rounded-full">
            {total} {total === 1 ? 'evaluación' : 'evaluaciones'}
          </span>
        </div>
        <div className={`p-1.5 rounded-full bg-bg-elevated border border-border/40 transition-colors group-hover:border-salud-blue/40 group-hover:bg-salud-blue/5`}>
          {isOpen
            ? <ChevronUp size={16} className="text-salud-blue" />
            : <ChevronDown size={16} className="text-text-tertiary group-hover:text-salud-blue transition-colors" />}
        </div>
      </button>

      {/* Vista colapsada: preview de la última evaluación */}
      {!isOpen && (
        <div
          onClick={handleOpen}
          className="mx-4 mb-4 p-3 border border-border/40 rounded-[var(--radius-md)] bg-bg-elevated cursor-pointer hover:border-salud-blue/30 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-salud-blue" />
              <span className="text-sm font-semibold text-text-primary">
                {total > 1 ? `Consulta más reciente` : 'Evaluación Inicial'}
              </span>
            </div>
            <span className="text-xs text-text-tertiary">
              {new Date(sorted[0].fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-text-secondary">
            <span><span className="font-bold text-text-primary">{sorted[0].pesoKg} kg</span></span>
            {sorted[0].tallaCm && (
              <span><span className="font-bold text-text-primary">{sorted[0].tallaCm} cm</span></span>
            )}
            {sorted[0].resultados && (
              <span>IMC <span className="font-bold text-salud-blue">{sorted[0].resultados.imc?.toFixed(1)}</span></span>
            )}
          </div>
          <p className="text-xs text-salud-blue font-semibold mt-2 group-hover:underline">
            Ver todas las evaluaciones ↓
          </p>
        </div>
      )}

      {/* Lista expandida */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">

          {/* Gráfica de peso */}
          <WeightChart data={consultas} />

          {/* Botón contraer — superior izquierda */}
          <button
            onClick={handleCollapse}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary hover:text-salud-blue transition-colors"
          >
            <ChevronUp size={14} />
            Contraer todo
          </button>

          {/* Tarjetas de evaluación */}
          <div className="space-y-4">
            {visible.map((consulta: any, idx: number) => {
              const isInicial = idx === total - 1;
              const label = isInicial ? 'Evaluación Inicial' : `Consulta #${total - idx}`;
              return (
                <div key={consulta.id || idx} className="bg-bg-elevated p-4 rounded-[var(--radius-md)] space-y-3">
                  {/* Cabecera de la consulta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-salud-blue" />
                      <span className="text-sm font-bold text-text-primary">{label}</span>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {new Date(consulta.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Métricas principales */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                      <span className="text-text-tertiary block text-xs mb-0.5">Peso</span>
                      <span className="font-extrabold text-text-primary">{consulta.pesoKg} <span className="text-xs font-normal">kg</span></span>
                    </div>
                    {consulta.tallaCm && (
                      <div className="bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                        <span className="text-text-tertiary block text-xs mb-0.5">Estatura</span>
                        <span className="font-extrabold text-text-primary">{consulta.tallaCm} <span className="text-xs font-normal">cm</span></span>
                      </div>
                    )}
                    {consulta.resultados && (
                      <div className="bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                        <span className="text-text-tertiary block text-xs mb-0.5">IMC</span>
                        <span className="font-extrabold text-salud-blue">{consulta.resultados.imc?.toFixed(1)}</span>
                        {consulta.resultados.clasificacionImc && (
                          <span className="block text-xs text-text-tertiary">{consulta.resultados.clasificacionImc}</span>
                        )}
                      </div>
                    )}
                    {(consulta.cinturaCm || consulta.circunferenciaCinturaCm) && (
                      <div className="bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                        <span className="text-text-tertiary block text-xs mb-0.5">Cintura</span>
                        <span className="font-bold text-text-primary">{consulta.cinturaCm || consulta.circunferenciaCinturaCm} <span className="text-xs font-normal">cm</span></span>
                      </div>
                    )}
                    {(consulta.caderaCm || consulta.circunferenciaCaderaCm) && (
                      <div className="bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                        <span className="text-text-tertiary block text-xs mb-0.5">Cadera</span>
                        <span className="font-bold text-text-primary">{consulta.caderaCm || consulta.circunferenciaCaderaCm} <span className="text-xs font-normal">cm</span></span>
                      </div>
                    )}
                  </div>

                  {/* Composición Corporal */}
                  {consulta.composicionCorporal && Object.values(consulta.composicionCorporal).some((v: any) => v !== undefined) && (
                    <div className="bg-bg-card p-3 rounded-lg border border-border/30">
                      <p className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">⚡ Composición Corporal</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {consulta.composicionCorporal.porcentajeGrasa !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">% Grasa</span>
                            <span className="font-bold text-salud-amber">{consulta.composicionCorporal.porcentajeGrasa}%</span>
                          </div>
                        )}
                        {consulta.composicionCorporal.grasaVisceral !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Grasa Visceral</span>
                            <span className="font-bold text-salud-red">Niv. {consulta.composicionCorporal.grasaVisceral}</span>
                          </div>
                        )}
                        {consulta.composicionCorporal.musculoEsqueletico !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">% Músculo</span>
                            <span className="font-bold text-salud-green">{consulta.composicionCorporal.musculoEsqueletico}%</span>
                          </div>
                        )}
                        {consulta.composicionCorporal.musculoEsqueleticoKg !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Músculo (kg)</span>
                            <span className="font-bold text-text-primary">{consulta.composicionCorporal.musculoEsqueleticoKg} kg</span>
                          </div>
                        )}
                        {consulta.composicionCorporal.aguaCorporal !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Agua Corporal</span>
                            <span className="font-bold text-salud-blue">{consulta.composicionCorporal.aguaCorporal}%</span>
                          </div>
                        )}
                        {consulta.composicionCorporal.edadMetabolica !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Edad Metabólica</span>
                            <span className="font-bold text-text-primary">{consulta.composicionCorporal.edadMetabolica} años</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Laboratorios */}
                  {consulta.laboratorios && (consulta.laboratorios.glucosa || consulta.laboratorios.presionArterial || consulta.laboratorios.homaIr) && (
                    <div className="space-y-2">
                      {consulta.laboratorios.homaIr && (
                        <div className="bg-salud-red-soft/40 border border-salud-red/20 p-2.5 rounded-lg flex items-center justify-between">
                          <span className="text-xs font-bold text-salud-red flex items-center gap-1.5">🩺 Resistencia a la Insulina (HOMA-IR)</span>
                          <span className="text-sm font-extrabold text-salud-red">{consulta.laboratorios.homaIr}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {consulta.laboratorios.glucosa && (
                          <div className="flex-1 min-w-[120px] bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                            <span className="text-text-tertiary block text-xs mb-0.5">Glucosa</span>
                            <span className="font-bold text-text-primary text-sm">{consulta.laboratorios.glucosa} <span className="text-xs font-normal">mg/dL</span></span>
                          </div>
                        )}
                        {consulta.laboratorios.presionArterial && (
                          <div className="flex-1 min-w-[120px] bg-bg-card p-2.5 rounded-lg border border-border/30 text-center">
                            <span className="text-text-tertiary block text-xs mb-0.5">Presión Arterial</span>
                            <span className="font-bold text-text-primary text-sm">{consulta.laboratorios.presionArterial}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resultados Metabólicos */}
                  {consulta.resultados && (consulta.resultados.tmb || consulta.resultados.get) && (
                    <div className="bg-bg-card p-3 rounded-lg border border-border/30">
                      <p className="text-xs font-bold text-text-primary mb-2">📊 Tu Gasto Energético</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {consulta.resultados.tmb && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Metabolismo Basal</span>
                            <span className="font-bold text-salud-blue">{Math.round(consulta.resultados.tmb)} kcal</span>
                          </div>
                        )}
                        {consulta.resultados.get && (
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Gasto Total (GET)</span>
                            <span className="font-bold text-salud-green">{Math.round(consulta.resultados.get)} kcal</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bienestar */}
                  {(consulta.nivelEnergia !== undefined || consulta.calidadDigestion || consulta.nivelAnsiedad) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {consulta.nivelEnergia !== undefined && (
                        <div className="flex items-center gap-1 bg-salud-green-soft/50 px-2.5 py-1 rounded-full border border-salud-green/20">
                          <span className="text-text-tertiary">Energía:</span>
                          <span className="font-bold text-salud-green">{consulta.nivelEnergia}/10</span>
                        </div>
                      )}
                      {consulta.calidadDigestion && (
                        <div className="flex items-center gap-1 bg-bg-card px-2.5 py-1 rounded-full border border-border/30">
                          <span className="text-text-tertiary">Digestión:</span>
                          <span className="font-semibold text-text-primary capitalize">{consulta.calidadDigestion}</span>
                        </div>
                      )}
                      {consulta.nivelAnsiedad && (
                        <div className="flex items-center gap-1 bg-bg-card px-2.5 py-1 rounded-full border border-border/30">
                          <span className="text-text-tertiary">Ansiedad:</span>
                          <span className="font-semibold text-text-primary capitalize">{consulta.nivelAnsiedad}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Indicaciones médicas */}
                  {consulta.indicacionesPaciente && (
                    <div className="bg-salud-green-soft/30 border border-salud-green/25 p-3 rounded-[var(--radius-md)]">
                      <p className="text-xs font-bold text-salud-green mb-1.5">💬 Recomendaciones de tu médico:</p>
                      <p className="text-sm text-text-primary whitespace-pre-wrap">{consulta.indicacionesPaciente}</p>
                    </div>
                  )}

                  {consulta.indicacionesPaciente && consulta.indicacionesPaciente.toLowerCase().includes('receta') && (
                    <div className="flex items-center gap-1.5 text-salud-purple text-xs font-bold">
                      <Pill size={14} /> Tienes una nueva receta médica
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controles inferiores */}
          <div className="space-y-2">
            {/* Ver más — centrado */}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={handleVerMas}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-salud-blue/30 bg-salud-blue/5 text-salud-blue text-xs font-bold hover:bg-salud-blue/10 hover:border-salud-blue/50 transition-all"
                >
                  <ChevronDown size={14} />
                  Ver más evaluaciones ({total - visibleCount} restantes)
                </button>
              </div>
            )}

            {/* Contraer todo — izquierda */}
            <button
              onClick={handleCollapse}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary hover:text-salud-blue transition-colors"
            >
              <ChevronUp size={14} />
              Contraer todo
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Perfil() {
  const { state: authState, dispatch: authDispatch } = useAuth();
  const { state: patientState, dispatch: patientDispatch } = usePatient();
  const { evaluacion } = patientState;

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const openPasswordModal = () => {
    setPasswordStep(1);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
  };

  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    
    if (!currentPassword) {
      setPasswordError('Por favor, ingresa tu contraseña actual.');
      return;
    }

    const userEmail = authState.user?.email;
    if (!userEmail) {
      setPasswordError('No se pudo determinar el correo del usuario.');
      return;
    }

    setIsVerifyingPassword(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (error) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      setPasswordStep(2);
      setPasswordError(null);
    } catch (err: any) {
      setPasswordError(err.message || 'Contraseña actual incorrecta.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setPasswordSuccess('¡Tu contraseña ha sido actualizada con éxito!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        closePasswordModal();
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Ocurrió un error al actualizar la contraseña.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    patientDispatch({ type: 'RESET' });
    authDispatch({ type: 'LOGOUT' });
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
          <UserCircle size={24} className="text-salud-purple" />
          Mi Perfil
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Gestiona tu información y preferencias
        </p>
      </div>

      <Card padding="lg" className="text-center relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-salud-blue to-salud-green mx-auto mb-4 flex items-center justify-center shadow-lg shadow-salud-blue/20">
          <HeartPulse size={32} className="text-white" />
        </div>
        <p className="text-lg font-bold text-text-primary">{authState.user?.email || 'Desconocido'}</p>
        <p className="text-sm text-text-secondary mt-1">
          {evaluacion ? evaluacion.nombre : 'Sesión de invitado'}
        </p>
      </Card>

      {/* Notice about institutional management */}
      <div className="bg-bg-elevated border border-border/40 p-3 rounded-[var(--radius-md)] flex items-start gap-3">
        <Info size={18} className="text-salud-green mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-text-primary">Tus datos médicos</p>
          <p className="text-xs text-text-secondary mt-0.5">La información clínica que ves a continuación es gestionada y actualizada exclusivamente por tu equipo médico en sus evaluaciones presenciales o virtuales.</p>
        </div>
      </div>

      {evaluacion && (
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-text-primary border-b border-border/50 pb-2 mb-4">
            Datos Clínicos y Metabólicos
          </h2>

          {/* MODO LECTURA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-tertiary font-medium">Peso Actual</p>
              <p className="text-sm font-bold text-text-primary">{evaluacion.pesoKg} kg</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">Estatura</p>
              <p className="text-sm font-bold text-text-primary">{evaluacion.tallaCm} cm</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">Actividad Física</p>
              <p className="text-sm font-bold text-text-primary">Nivel {evaluacion.nivelActividad}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">Objetivo</p>
              <p className="text-sm font-bold text-text-primary capitalize">
                {(Array.isArray(evaluacion.objetivo as unknown)
                  ? (evaluacion.objetivo as unknown as string[])
                  : [evaluacion.objetivo as unknown as string]
                ).map(o => String(o).replace(/_/g, ' ')).join(', ')}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-text-tertiary font-medium">Condiciones</p>
              <p className="text-sm font-bold text-text-primary">{evaluacion.condiciones.join(', ') || 'Ninguna'}</p>
            </div>
          </div>
          
          {/* Antropometría y Fármacos (Lectura) */}
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-tertiary font-medium">Cintura / Cadera</p>
              <p className="text-sm font-bold text-text-primary">
                {evaluacion.circunferenciaCinturaCm || '--'} cm / {evaluacion.circunferenciaCaderaCm || '--'} cm
              </p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">Glucosa / PA / Insulina</p>
              <p className="text-sm font-bold text-text-primary">
                {evaluacion.laboratorios?.glucosa ? `${evaluacion.laboratorios.glucosa} mg/dL` : '--'} / {evaluacion.laboratorios?.presionArterial || '--'}
                {evaluacion.laboratorios?.insulina ? ` / ${evaluacion.laboratorios.insulina} µU/mL` : ''}
              </p>
            </div>
            {evaluacion.laboratorios?.homaIr && (
              <div className="col-span-2 bg-salud-red-soft/40 border border-salud-red/20 p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-xs font-bold text-salud-red flex items-center gap-1.5">🩺 Resistencia a la Insulina (HOMA-IR)</span>
                <span className="text-sm font-extrabold text-salud-red">{evaluacion.laboratorios.homaIr}</span>
              </div>
            )}
            {evaluacion.composicionCorporal && (
              <div className="col-span-2 bg-bg-elevated p-3 rounded-lg space-y-2 border border-border/40">
                <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span>⚡</span> Composición Corporal / Bioimpedancia
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-text-secondary block">Grasa Corp.</span>
                    <strong className="text-text-primary">{evaluacion.composicionCorporal.porcentajeGrasa ? `${evaluacion.composicionCorporal.porcentajeGrasa}%` : '--'}</strong>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Grasa Visc.</span>
                    <strong className="text-salud-amber">{evaluacion.composicionCorporal.grasaVisceral ? `Nivel ${evaluacion.composicionCorporal.grasaVisceral}` : '--'}</strong>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Músculo (%)</span>
                    <strong className="text-salud-green">{evaluacion.composicionCorporal.musculoEsqueletico ? `${evaluacion.composicionCorporal.musculoEsqueletico}%` : '--'}</strong>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Músculo (kg)</span>
                    <strong className="text-text-primary">{evaluacion.composicionCorporal.musculoEsqueleticoKg ? `${evaluacion.composicionCorporal.musculoEsqueleticoKg} kg` : '--'}</strong>
                  </div>
                </div>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-text-tertiary font-medium">Fármacos Actuales</p>
              <p className="text-sm font-bold text-text-primary">{evaluacion.medicamentosActuales || 'Ninguno registrado'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Resultados de GET en Perfil */}
      {patientState.resultados && (
        <Card className="bg-bg-elevated border-border/40">
          <h2 className="text-sm font-bold text-salud-blue mb-2">Tu Gasto Energético Actual</h2>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Meta Diaria (GET):</span>
            <span className="text-lg font-extrabold text-text-primary">
              {Math.round(patientState.resultados.get)} Kcal
            </span>
          </div>
        </Card>
      )}

      {/* Historial de Consultas */}
      {patientState.historialConsultas && patientState.historialConsultas.length > 0 && (
        <HistorialClinico consultas={patientState.historialConsultas} />
      )}


      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={openPasswordModal}
          icon={<Lock size={18} />}
        >
          Cambiar contraseña
        </Button>
        <Button
          variant="danger"
          fullWidth
          onClick={handleLogout}
          icon={<LogOut size={18} />}
        >
          Cerrar sesión
        </Button>
      </div>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordModal}
        title="Cambiar Contraseña"
      >
        <div className="mb-6 px-4">
          <div className="flex items-center justify-between relative mb-2">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-border z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-salud-blue transition-all duration-300 z-0"
              style={{ width: passwordStep === 1 ? '0%' : '100%' }}
            />
            
            <div className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  passwordStep >= 1 
                    ? 'bg-salud-blue text-white ring-4 ring-salud-blue/10' 
                    : 'bg-bg-elevated text-text-tertiary border border-border'
                }`}
              >
                1
              </div>
              <span className="text-[10px] font-bold text-text-secondary mt-1">Verificación</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  passwordStep >= 2 
                    ? 'bg-salud-blue text-white ring-4 ring-salud-blue/10' 
                    : 'bg-bg-elevated text-text-tertiary border border-border'
                }`}
              >
                2
              </div>
              <span className="text-[10px] font-bold text-text-secondary mt-1">Nueva Contraseña</span>
            </div>
          </div>
        </div>

        {passwordStep === 1 ? (
          <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-primary">
                Contraseña actual
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Introduce tu contraseña actual"
                  className="pr-12"
                  icon={<Lock size={18} />}
                  disabled={isVerifyingPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer flex items-center justify-center"
                  disabled={isVerifyingPassword}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="bg-salud-red-soft border border-salud-red/20 rounded-[var(--radius-md)] px-4 py-2.5 animate-scale-in">
                <p className="text-sm text-red-800 font-medium">{passwordError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={closePasswordModal}
                disabled={isVerifyingPassword}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isVerifyingPassword}
              >
                {isVerifyingPassword ? 'Verificando...' : 'Siguiente'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-primary">
                Nueva contraseña
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-12"
                  icon={<Lock size={18} />}
                  disabled={isUpdatingPassword || !!passwordSuccess}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer flex items-center justify-center"
                  disabled={isUpdatingPassword || !!passwordSuccess}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-primary">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="pr-12"
                  icon={<Lock size={18} />}
                  disabled={isUpdatingPassword || !!passwordSuccess}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer flex items-center justify-center"
                  disabled={isUpdatingPassword || !!passwordSuccess}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="bg-salud-red-soft border border-salud-red/20 rounded-[var(--radius-md)] px-4 py-2.5 animate-scale-in">
                <p className="text-sm text-red-800 font-medium">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-salud-green-soft border border-salud-green/20 rounded-[var(--radius-md)] px-4 py-2.5 animate-scale-in flex items-center gap-2">
                <CheckCircle size={18} className="text-salud-green flex-shrink-0" />
                <p className="text-sm text-salud-green font-bold">{passwordSuccess}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setPasswordStep(1);
                  setPasswordError(null);
                }}
                disabled={isUpdatingPassword || !!passwordSuccess}
              >
                Atrás
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isUpdatingPassword || !!passwordSuccess}
              >
                {isUpdatingPassword ? 'Actualizando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
