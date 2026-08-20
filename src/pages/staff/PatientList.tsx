import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Eye, Edit, Trash2, Activity, Settings2 } from 'lucide-react';
import { useStaff } from '../../contexts/StaffContext';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import ObjetivosManager from '../../components/staff/ObjetivosManager';
import type { PatientListItem } from '../../types/patients';

// =============================================
// Staff: Lista de Pacientes
// =============================================

export default function PatientList() {
  const navigate = useNavigate();
  const { getPatientList } = useStaff();
  const patients = getPatientList();
  const [showObjetivosManager, setShowObjetivosManager] = useState(false);

  const getStatusBadge = (estatus: string) => {
    switch (estatus) {
      case 'activo': return <Badge variant="success" dot>Activo</Badge>;
      case 'inactivo': return <Badge variant="warning" dot>Inactivo</Badge>;
      case 'alta': return <Badge variant="info" dot>Alta</Badge>;
      default: return <Badge>{estatus}</Badge>;
    }
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

  const columns: Column<PatientListItem>[] = [
    {
      header: 'Paciente',
      accessorKey: 'nombre', // Fallback for sorting
      sortable: true,
      cell: (patient) => (
        <div className="flex items-center gap-3">
          <Avatar nombre={patient.nombre} apellido={patient.apellido} role="paciente" size="md" />
          <div>
            <p className="font-bold text-text-primary text-sm">
              {patient.nombre} {patient.apellido || ''}
            </p>
            <p className="text-xs text-text-tertiary font-medium">{patient.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Estatus',
      accessorKey: 'estatus',
      sortable: true,
      cell: (patient) => getStatusBadge(patient.estatus),
    },
    {
      header: 'Perfil',
      accessorKey: 'edad',
      sortable: true,
      cell: (patient) => (
        <div className="text-sm text-text-secondary">
          {patient.edad} años • {patient.sexo === 'hombre' ? 'M' : 'F'}
        </div>
      ),
    },
    {
      header: 'Clínico',
      accessorKey: 'objetivo',
      cell: (patient) => (
        <div>
          <p className="text-sm font-semibold text-text-secondary">{getObjetivoLabel(patient.objetivo)}</p>
          {patient.imc && (
            <p className="text-xs text-salud-blue font-bold">IMC {patient.imc.toFixed(1)}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Última Eval.',
      accessorKey: 'ultimaEvaluacion',
      sortable: true,
      cell: (patient) => {
        if (!patient.ultimaEvaluacion) return <span className="text-text-tertiary">Sin evaluaciones</span>;
        const date = new Date(patient.ultimaEvaluacion);
        return (
          <span className="text-sm text-text-secondary font-medium whitespace-nowrap">
            {date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      header: '',
      accessorKey: 'actions',
      className: 'w-10 text-right',
      cell: (patient) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => navigate(`/staff/pacientes/${patient.id}`)}
            className="p-1.5 text-text-tertiary hover:text-salud-blue hover:bg-salud-blue-soft/50 rounded-md transition-colors cursor-pointer"
            title="Ver ficha médica"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => navigate(`/staff/pacientes/${patient.id}/evaluar`)}
            className="p-1.5 text-text-tertiary hover:text-salud-green hover:bg-salud-green-soft/50 rounded-md transition-colors cursor-pointer"
            title="Iniciar consulta médica"
          >
            <Activity size={16} />
          </button>
          <button 
            className="p-1.5 text-text-tertiary hover:text-salud-amber hover:bg-salud-amber-soft/50 rounded-md transition-colors cursor-pointer"
            title="Editar datos rápidos"
          >
            <Edit size={16} />
          </button>
          <button 
            className="p-1.5 text-text-tertiary hover:text-salud-red hover:bg-salud-red-soft/50 rounded-md transition-colors cursor-pointer"
            title="Archivar paciente"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Directorio de Pacientes
          </h1>
          <p className="text-text-secondary mt-1">
            Gestiona la atención nutricional de todos tus pacientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowObjetivosManager(true)}
            icon={<Settings2 size={18} />}
            size="md"
          >
            Parámetros
          </Button>
          <Button
            onClick={() => navigate('/staff/pacientes/nuevo')}
            icon={<UserPlus size={18} />}
            size="md"
          >
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={patients}
        columns={columns}
        keyExtractor={(p) => p.id}
        searchable
        searchPlaceholder="Buscar por nombre, email o condición..."
        itemsPerPage={10}
        onRowClick={(patient) => navigate(`/staff/pacientes/${patient.id}`)}
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
              <Users size={28} className="text-text-tertiary" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">Sin pacientes</h3>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              Aún no tienes pacientes registrados. Agrega uno nuevo para comenzar a gestionar sus planes.
            </p>
            <Button
              onClick={() => navigate('/staff/pacientes/nuevo')}
              icon={<UserPlus size={16} />}
              size="sm"
            >
              Nuevo Paciente
            </Button>
          </div>
        }
      />
      
      <ObjetivosManager 
        isOpen={showObjetivosManager} 
        onClose={() => setShowObjetivosManager(false)} 
      />
    </div>
  );
}
