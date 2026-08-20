import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SystemOption } from '../types';

interface SystemOptionsContextType {
  options: SystemOption[];
  loading: boolean;
  refreshOptions: () => Promise<void>;
  getOptionsByCategory: (categoria: SystemOption['categoria']) => SystemOption[];
}

const SystemOptionsContext = createContext<SystemOptionsContextType | undefined>(undefined);

export function SystemOptionsProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<SystemOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = async () => {
    setLoading(true);
    // Ignore error silently to prevent app crash if table doesn't exist yet
    const { data, error } = await supabase
      .from('system_options')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setOptions(data as SystemOption[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOptions();

    // Suscripción a cambios en tiempo real
    const channel = supabase.channel('system-options-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_options' },
        () => {
          // Volver a descargar todo cuando haya un cambio
          fetchOptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getOptionsByCategory = (categoria: SystemOption['categoria'], includeInactive = false) => {
    return options.filter(o => o.categoria === categoria && (includeInactive || o.activo));
  };

  return (
    <SystemOptionsContext.Provider value={{ options, loading, refreshOptions: fetchOptions, getOptionsByCategory }}>
      {children}
    </SystemOptionsContext.Provider>
  );
}

export function useSystemOptions() {
  const context = useContext(SystemOptionsContext);
  if (context === undefined) {
    throw new Error('useSystemOptions must be used within a SystemOptionsProvider');
  }
  return context;
}
