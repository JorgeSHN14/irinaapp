import { useNavigate } from 'react-router-dom';
import { Users, ClipboardPlus, Activity, AlertTriangle, UserPlus, ChevronRight, CalendarCheck, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../../contexts/StaffContext';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

// =============================================
// Staff Dashboard — Panel de Control Médico
// =============================================

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getDashboardStats, getPatientList } = useStaff();
  const stats = getDashboardStats();
  const patients = getPatientList();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getObjetivoLabel = (obj: string | string[]) => {
    const map: Record<string, string> = {
      mantener: 'Mantener peso',
      perder_grasa: 'Perder grasa',
      ganar_masa: 'Ganar masa',
    };
    if (Array.isArray(obj)) {
      return obj.length > 0 ? obj.map(o => map[o] || o).join(', ') : 'Sin objetivo';
    }
    return map[obj as string] || obj || 'Sin objetivo';
  };

  const getStatusBadge = (estatus: string) => {
    switch (estatus) {
      case 'activo': return <Badge variant="success" dot>Activo</Badge>;
      case 'inactivo': return <Badge variant="warning" dot>Inactivo</Badge>;
      case 'alta': return <Badge variant="info" dot>Alta</Badge>;
      default: return <Badge>{estatus}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary tracking-tight">
            {getGreeting()}, {user?.nombre?.split(' ')[0]}
          </h1>
          <p className="text-text-secondary mt-1">
            Panel de control — {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button
          onClick={() => navigate('/staff/pacientes/nuevo')}
          icon={<UserPlus size={18} />}
          size="md"
        >
          Nuevo Paciente
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pacientes Activos"
          value={stats.totalPacientesActivos}
          subtitle="en seguimiento"
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          label="Evaluaciones Hoy"
          value={stats.totalEvaluacionesHoy}
          subtitle={`${stats.totalEvaluacionesSemana} esta semana`}
          icon={<ClipboardPlus size={20} />}
          color="green"
        />
        <StatCard
          label="IMC Promedio"
          value={stats.promedioImc > 0 ? stats.promedioImc.toFixed(1) : '—'}
          subtitle="de pacientes activos"
          icon={<Activity size={20} />}
          color="amber"
        />
        <StatCard
          label="Alertas Críticas"
          value={stats.alertasCriticas}
          subtitle="requieren atención"
          icon={<AlertTriangle size={20} />}
          color={stats.alertasCriticas > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Patients Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients (2/3 width) */}
        <div className="lg:col-span-2">
          <Card animate={false} padding="sm">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h2 className="text-base font-bold text-text-primary">Pacientes Recientes</h2>
              <button
                onClick={() => navigate('/staff/pacientes')}
                className="text-xs font-bold text-salud-blue hover:underline cursor-pointer flex items-center gap-1"
              >
                Ver todos <ChevronRight size={14} />
              </button>
            </div>

            {patients.length === 0 ? (
              <EmptyState
                title="Sin pacientes aún"
                description="Registra tu primer paciente para comenzar a gestionar su atención nutricional."
                action={
                  <Button onClick={() => navigate('/staff/pacientes/nuevo')} icon={<UserPlus size={16} />} size="sm">
                    Registrar Paciente
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border/40">
                {patients.slice(0, 6).map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => navigate(`/staff/pacientes/${patient.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated/50 transition-colors cursor-pointer text-left"
                  >
                    <Avatar nombre={patient.nombre} apellido={patient.apellido} role="paciente" size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {patient.nombre} {patient.apellido || ''}
                        </p>
                        {getStatusBadge(patient.estatus)}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-text-tertiary">{patient.edad} años</span>
                        <span className="text-xs text-text-tertiary">•</span>
                        <span className="text-xs text-text-tertiary">{getObjetivoLabel(patient.objetivo)}</span>
                        {patient.imc && (
                          <>
                            <span className="text-xs text-text-tertiary">•</span>
                            <span className="text-xs font-medium text-salud-blue">IMC {patient.imc.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions (1/3 width) */}
        <div className="space-y-4">
          <Card padding="lg">
            <h2 className="text-base font-bold text-text-primary mb-4">Acciones Rápidas</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/staff/pacientes/nuevo')}
                className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-border/40
                           hover:border-salud-blue/30 hover:bg-salud-blue-soft/20
                           transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-salud-blue-soft flex items-center justify-center text-salud-blue group-hover:bg-salud-blue group-hover:text-white transition-colors">
                  <UserPlus size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-text-primary">Nuevo Paciente</p>
                  <p className="text-[11px] text-text-tertiary">Registrar paciente</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/staff/pacientes')}
                className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-border/40
                           hover:border-salud-green/30 hover:bg-salud-green-soft/20
                           transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-salud-green-soft flex items-center justify-center text-salud-green group-hover:bg-salud-green group-hover:text-white transition-colors">
                  <Users size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-text-primary">Mis Pacientes</p>
                  <p className="text-[11px] text-text-tertiary">Gestionar pacientes</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/staff/contenido')}
                className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-border/40
                           hover:border-salud-blue/30 hover:bg-salud-blue-soft/20
                           transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-salud-blue-soft flex items-center justify-center text-salud-blue group-hover:bg-salud-blue group-hover:text-white transition-colors">
                  <BookOpen size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-text-primary">Guías Nutricionales</p>
                  <p className="text-[11px] text-text-tertiary">Subir y gestionar guías</p>
                </div>
              </button>
            </div>
          </Card>

          {/* Today's Schedule Placeholder */}
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck size={18} className="text-salud-blue" />
              <h2 className="text-base font-bold text-text-primary">Hoy</h2>
            </div>
            <div className="text-center py-4">
              <p className="text-3xl font-extrabold text-text-primary">{stats.totalEvaluacionesHoy}</p>
              <p className="text-xs text-text-tertiary mt-1">evaluaciones realizadas</p>
            </div>
            <div className="h-px bg-border/40 my-3" />
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Esta semana</span>
              <span className="font-bold text-text-primary">{stats.totalEvaluacionesSemana} evaluaciones</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
