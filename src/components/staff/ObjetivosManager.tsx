import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSystemOptions } from '../../contexts/SystemOptionsContext';
import DataTable, { type Column } from '../ui/DataTable';
import SlideOver from '../ui/SlideOver';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import type { SystemOption } from '../../types';

interface ObjetivosManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ObjetivosManager({ isOpen, onClose }: ObjetivosManagerProps) {
  const { options, refreshOptions } = useSystemOptions();
  const objetivos = options.filter(o => o.categoria === 'objetivo');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleEstado = async (id: string, current: boolean) => {
    try {
      await supabase
        .from('system_options')
        .update({ activo: !current })
        .eq('id', id);
      await refreshOptions();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este objetivo?')) return;
    try {
      await supabase
        .from('system_options')
        .delete()
        .eq('id', id);
      await refreshOptions();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const handleAdd = async () => {
    if (!newVal.trim()) return;
    setLoading(true);
    try {
      const slug = newVal.trim().toLowerCase().replace(/\s+/g, '_');
      await supabase
        .from('system_options')
        .insert({
          categoria: 'objetivo',
          valor: slug, // Internally it acts like ID or slug
        });
      await refreshOptions();
      setNewVal('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert('Error al añadir');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<SystemOption>[] = [
    {
      header: 'Objetivo',
      accessorKey: 'valor',
      sortable: true,
      cell: (item) => (
        <span className="font-semibold text-text-primary capitalize">
          {item.valor.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      cell: (item) => (
        <Badge variant={item.activo ? 'success' : 'warning'} dot>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      accessorKey: 'id',
      className: 'w-24 text-right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleToggleEstado(item.id, item.activo)}
            className={`p-1.5 transition-colors cursor-pointer ${item.activo ? 'text-salud-green hover:text-salud-green/70' : 'text-text-tertiary hover:text-text-secondary'}`}
            title={item.activo ? 'Inactivar' : 'Activar'}
          >
            {item.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="p-1.5 text-text-tertiary hover:text-salud-red transition-colors cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Objetivos"
      width="max-w-xl"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-text-secondary">
            Administra los objetivos nutricionales disponibles para los pacientes.
          </p>
          {!isAdding && (
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsAdding(true)}>
              Añadir
            </Button>
          )}
        </div>

        {isAdding && (
          <div className="p-4 bg-bg-elevated border border-border/40 rounded-lg flex items-center gap-3">
            <Input 
              type="text" 
              placeholder="Ej. Definición Muscular" 
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" disabled={loading} onClick={handleAdd}>
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewVal(''); }}>
              Cancelar
            </Button>
          </div>
        )}

        <DataTable
          data={objetivos}
          columns={columns}
          keyExtractor={(o) => o.id}
          itemsPerPage={10}
          emptyState={
            <div className="py-8 text-center text-sm text-text-tertiary">
              No hay objetivos configurados.
            </div>
          }
        />
      </div>
    </SlideOver>
  );
}
