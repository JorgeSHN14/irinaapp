import { ShieldAlert, Plus, Edit, Trash2, Mail, Lock, User, Briefcase, Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import type { CreateStaffData, StaffRole } from '../../../types/auth';

// =============================================
// Componente: Formulario de Personal
// =============================================
function StaffFormModal({ isOpen, onClose, onSave, isEditing, initialData, isSaving }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStaffData) => void;
  isEditing: boolean;
  initialData?: Partial<CreateStaffData>;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<CreateStaffData>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    role: 'asistente',
    especialidad: '',
    telefono: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: initialData?.email || '',
        password: '',
        nombre: initialData?.nombre || '',
        apellido: initialData?.apellido || '',
        role: (initialData?.role as StaffRole) || 'asistente',
        especialidad: initialData?.especialidad || '',
        telefono: initialData?.telefono || '',
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario / Asistente'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Nombre *</label>
            <Input
              type="text"
              required
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              icon={<User size={16} />}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Apellido</label>
            <Input
              type="text"
              value={formData.apellido}
              onChange={e => setFormData({ ...formData, apellido: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Email *</label>
            <Input
              type="email"
              required
              disabled={isEditing}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={16} />}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Contraseña {isEditing ? '(sin cambiar)' : '*'}</label>
            <Input
              type="password"
              required={!isEditing}
              disabled={isEditing}
              placeholder={isEditing ? '••••••••' : ''}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              icon={<Lock size={16} />}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Rol de Acceso *</label>
            <Select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as StaffRole })}
            >
              <option value="asistente">Asistente (Médico / Administrativo)</option>
              <option value="especialista">Especialista (Médico / Nutricionista)</option>
              <option value="staff">Staff Administrativo / Recepción</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Teléfono</label>
            <Input
              type="tel"
              value={formData.telefono}
              onChange={e => setFormData({ ...formData, telefono: e.target.value })}
              icon={<Phone size={16} />}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-text-secondary">Especialidad / Cargo</label>
          <Input
            type="text"
            placeholder="Ej. Asistente Clínico, Nutrición, Recepción..."
            value={formData.especialidad}
            onChange={e => setFormData({ ...formData, especialidad: e.target.value })}
            icon={<Briefcase size={16} />}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-border/40">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Guardando...
              </span>
            ) : (
              isEditing ? 'Guardar Cambios' : 'Registrar Usuario'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// =============================================
// Admin: Gestión de Personal y Asistentes
// =============================================

export default function StaffManagement() {
  const { user } = useAuth();
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'especialista', 'staff', 'asistente'])
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      if (data) {
        const mapped = data.map(u => ({
          id: u.id,
          nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim(),
          firstName: u.nombre,
          lastName: u.apellido,
          email: u.email,
          role: u.role,
          estatus: u.is_active ? 'activo' : 'inactivo',
          especialidad: u.especialidad || 'Sin especialidad',
          telefono: u.telefono || ''
        }));
        setStaffList(mapped);
      }
    } catch (err: any) {
      console.error('Error cargando lista de personal:', err);
      setErrorMsg(err.message || 'Error al obtener usuarios de la base de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const isAdmin = user?.role === 'admin';
  const isStaffMember = !!user && user.role !== 'paciente';

  // Protect route for non-staff
  if (!isStaffMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <ShieldAlert size={64} className="text-salud-red mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Acceso Denegado</h2>
        <p className="text-text-secondary max-w-md">
          No tienes permisos de personal para ver la información de la institución.
        </p>
      </div>
    );
  }

  const handleSaveStaff = async (data: CreateStaffData) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (editingStaff) {
        // Actualizar en base de datos public.users
        const { error: updateError } = await supabase
          .from('users')
          .update({
            nombre: data.nombre,
            apellido: data.apellido || null,
            role: data.role,
            especialidad: data.especialidad || null,
            telefono: data.telefono || null,
          })
          .eq('id', editingStaff.id);

        if (updateError) throw updateError;
        setSuccessMsg(`Usuario ${data.nombre} actualizado correctamente.`);
      } else {
        // Crear usuario via Edge Function (usa Admin API con email_confirm: true,
        // igual que create-patient, para que el usuario pueda loguearse de inmediato con su contraseña)
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-user', {
          body: {
            email: data.email,
            password: data.password,
            nombre: data.nombre,
            apellido: data.apellido || '',
            role: data.role,
            especialidad: data.especialidad || '',
            telefono: data.telefono || '',
          }
        });

        // Si la Edge Function devuelve un error en el body (ej: email ya existe)
        if (edgeData?.error) {
          throw new Error(edgeData.error);
        }

        // Si hay un error de red / función no desplegada
        if (edgeError) {
          throw new Error(
            `La Edge Function 'create-user' no está disponible: ${edgeError.message}. ` +
            `Asegúrate de haber desplegado las funciones con "supabase functions deploy create-user".`
          );
        }

        // La Edge Function ya creó el usuario en auth.users con email_confirm: true
        // y también insertó el registro en public.users, no se necesita upsert adicional.
        if (!edgeData?.userId) {
          throw new Error('La Edge Function no devolvió un userId válido. Revisa los logs de Supabase.');
        }

        setSuccessMsg(`Nuevo usuario ${data.nombre} registrado con éxito. Ya puede iniciar sesión con su contraseña.`);
      }

      await fetchStaff();
      setIsModalOpen(false);
      setEditingStaff(null);
    } catch (err: any) {
      console.error('Error guardando usuario:', err);
      const msg = err.message || String(err);
      if (msg.includes('foreign key') || msg.includes('users_id_fkey')) {
        setErrorMsg('Error de vinculación: El usuario debe registrarse primero en la tabla de autenticación de Supabase (auth.users).');
      } else if (msg.includes('row-level security') || msg.includes('violates row-level security')) {
        setErrorMsg('Error RLS de Supabase: Tu cuenta de Supabase aún no tiene habilitadas las políticas para insertar o modificar usuarios. Por favor ejecuta la consulta de fix_rls.sql en el Editor SQL de Supabase.');
      } else {
        setErrorMsg(`Error al guardar en base de datos: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: any) => {
    if (staff.id === user?.id) {
      alert('No puedes desactivar tu propia cuenta de administrador.');
      return;
    }

    const newStatus = staff.estatus !== 'activo';
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', staff.id);

      if (error) throw error;
      await fetchStaff();
    } catch (err: any) {
      console.error('Error cambiando estatus:', err);
      alert(`Error al actualizar estado: ${err.message}`);
    }
  };

  const handleDeleteStaff = async (staff: any) => {
    if (staff.id === user?.id) {
      alert('No puedes eliminar tu propia cuenta.');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar a ${staff.nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', staff.id);

      if (error) throw error;
      setSuccessMsg(`Usuario ${staff.nombre} eliminado de la base de datos.`);
      await fetchStaff();
    } catch (err: any) {
      console.error('Error eliminando usuario:', err);
      alert(`Error al eliminar usuario: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      <StaffFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingStaff(null); }}
        onSave={handleSaveStaff}
        isEditing={!!editingStaff}
        isSaving={saving}
        initialData={editingStaff ? {
          nombre: editingStaff.firstName || editingStaff.nombre.split(' ')[0],
          apellido: editingStaff.lastName || editingStaff.nombre.split(' ').slice(1).join(' '),
          email: editingStaff.email,
          role: editingStaff.role,
          especialidad: editingStaff.especialidad,
          telefono: editingStaff.telefono
        } : undefined}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Gestión de Personal y Asistentes</h1>
          <p className="text-text-secondary text-sm mt-1">
            {isAdmin 
              ? 'Registra y administra los accesos del equipo institucional (asistentes, especialistas y administradores).'
              : 'Directorio del equipo institucional (asistentes, especialistas y administradores).'
            }
          </p>
        </div>
        {isAdmin && (
          <Button icon={<Plus size={18} />} onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}>
            Nuevo Usuario
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-salud-blue-soft border border-salud-blue/20 text-salud-blue text-xs font-semibold flex items-center gap-2">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <span>Vista de equipo en modo lectura: Únicamente los administradores tienen permiso para crear nuevos usuarios o modificar perfiles.</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-salud-green/10 border border-salud-green/30 text-salud-green flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-salud-red/10 border border-salud-red/30 text-salud-red flex items-center gap-3 animate-fade-in">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-elevated/50 border-b border-border/50">
                <th className="p-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">Usuario</th>
                <th className="p-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">Rol de Acceso</th>
                <th className="p-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">Especialidad / Cargo</th>
                <th className="p-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-bold text-text-tertiary uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-text-secondary">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-salud-blue" />
                      <span>Cargando usuarios desde la base de datos...</span>
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-text-tertiary">No hay usuarios o asistentes registrados</td></tr>
              ) : staffList.map((staff) => (
                <tr key={staff.id} className={`border-b border-border/40 hover:bg-bg-elevated/30 transition-colors ${staff.estatus === 'inactivo' ? 'opacity-60' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={staff.nombre} role={staff.role as any} size="sm" />
                      <div>
                        <p className="font-bold text-text-primary text-sm">{staff.nombre}</p>
                        <p className="text-xs text-text-secondary">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                      staff.role === 'admin' ? 'bg-salud-purple-soft text-salud-purple border border-salud-purple/20' :
                      staff.role === 'especialista' ? 'bg-salud-blue-soft text-salud-blue border border-salud-blue/20' :
                      staff.role === 'asistente' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-salud-green-soft text-salud-green border border-salud-green/20'
                    }`}>
                      {staff.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text-primary">{staff.especialidad}</td>
                  <td className="p-4">
                    {staff.estatus === 'activo' 
                      ? <Badge variant="success" dot>Activo</Badge> 
                      : <Badge variant="warning" dot>Inactivo</Badge>
                    }
                  </td>
                  <td className="p-4 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingStaff(staff); setIsModalOpen(true); }}
                          className="p-1.5 text-text-tertiary hover:text-salud-blue hover:bg-salud-blue-soft/50 rounded-md transition-colors cursor-pointer" title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(staff)}
                          className={`p-1.5 text-text-tertiary rounded-md transition-colors cursor-pointer ${staff.id === user?.id ? 'opacity-50 cursor-not-allowed' : 'hover:text-amber-600 hover:bg-amber-50'}`} 
                          title={staff.estatus === 'activo' ? 'Desactivar' : 'Activar'} 
                          disabled={staff.id === user?.id}
                        >
                          <Badge variant={staff.estatus === 'activo' ? 'warning' : 'success'} className="px-1.5 py-0.5 text-[10px]">
                            {staff.estatus === 'activo' ? 'Desactivar' : 'Activar'}
                          </Badge>
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(staff)}
                          className={`p-1.5 text-text-tertiary rounded-md transition-colors cursor-pointer ${staff.id === user?.id ? 'opacity-50 cursor-not-allowed' : 'hover:text-salud-red hover:bg-salud-red-soft/50'}`} 
                          title="Eliminar"
                          disabled={staff.id === user?.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary font-medium">Solo lectura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

