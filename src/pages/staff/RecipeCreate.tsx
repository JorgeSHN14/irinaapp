import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ArrowLeft, Save, Search, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Textarea from '../../components/ui/Textarea';
import { supabase } from '../../lib/supabase';
import { useSystemOptions } from '../../contexts/SystemOptionsContext';

interface IngredienteDB {
  id: string;
  nombre: string;
  proteinas: number | null;
  carbohidratos: number | null;
  grasas: number | null;
  calorias: number;
}

interface IngredienteSeleccionado {
  id: string;
  nombre: string;
  cantidad: number; // en gramos
  // Macros base (por 100g) guardados para recalculación
  proteinasBase: number;
  carbohidratosBase: number;
  grasasBase: number;
  caloriasBase: number;
}

export default function RecipeCreate() {
  const navigate = useNavigate();
  const { getOptionsByCategory } = useSystemOptions();
  const dbCondiciones = getOptionsByCategory('condicion');
  
  const fallbackCondiciones = [
    { id: 'c1', valor: 'Diabetes (Cualquier tipo)', icono: '🩸', categoria: 'condicion', activo: true },
    { id: 'c2', valor: 'Hipertensión', icono: '🫀', categoria: 'condicion', activo: true },
    { id: 'c3', valor: 'Dislipidemia / Colesterol', icono: '🩸', categoria: 'condicion', activo: true },
    { id: 'c4', valor: 'SOP (Ovarios Poliquísticos)', icono: '♀️', categoria: 'condicion', activo: true },
  ];
  const condicionesDinamicas = dbCondiciones.length > 0 ? dbCondiciones : fallbackCondiciones;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'desayuno',
    dificultad: 'facil',
    tiempoPreparacionMin: 15,
    porcionesRinde: 1,
    instruccionesText: '',
    patologia: 'General',
  });

  // Estados para ingredientes
  const [selectedIngredients, setSelectedIngredients] = useState<IngredienteSeleccionado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<IngredienteDB[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estado para el ingrediente que se está editando antes de agregarlo
  const [activeIngredient, setActiveIngredient] = useState<IngredienteDB | null>(null);
  const [amountGrams, setAmountGrams] = useState<number>(100);

  // Debounce para búsqueda en base de datos
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('Ingrendientes')
        .select('*')
        .ilike('nombre', `%${searchTerm}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data as IngredienteDB[]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleSelectSearchResult = (ingrediente: IngredienteDB) => {
    setActiveIngredient(ingrediente);
    setAmountGrams(100); // Reset a cantidad predeterminada
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleAddIngredient = () => {
    if (!activeIngredient) return;

    // Evitar duplicados modificando la cantidad o simplemente no agregando
    const exists = selectedIngredients.find(i => i.id === activeIngredient.id);
    if (exists) {
      alert('Este ingrediente ya está en la receta. Si deseas cambiar su cantidad, elimínalo y agrégalo de nuevo.');
      return;
    }

    const nuevoIngrediente: IngredienteSeleccionado = {
      id: activeIngredient.id,
      nombre: activeIngredient.nombre,
      cantidad: amountGrams,
      proteinasBase: activeIngredient.proteinas || 0,
      carbohidratosBase: activeIngredient.carbohidratos || 0,
      grasasBase: activeIngredient.grasas || 0,
      caloriasBase: activeIngredient.calorias || 0,
    };

    setSelectedIngredients([...selectedIngredients, nuevoIngrediente]);
    setActiveIngredient(null);
  };

  const handleRemoveIngredient = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter(i => i.id !== id));
  };

  // Cálculos en tiempo real
  const totalKcal = selectedIngredients.reduce((sum, ing) => sum + (ing.caloriasBase * ing.cantidad) / 100, 0);
  const totalProt = selectedIngredients.reduce((sum, ing) => sum + (ing.proteinasBase * ing.cantidad) / 100, 0);
  const totalCho = selectedIngredients.reduce((sum, ing) => sum + (ing.carbohidratosBase * ing.cantidad) / 100, 0);
  const totalGrasas = selectedIngredients.reduce((sum, ing) => sum + (ing.grasasBase * ing.cantidad) / 100, 0);

  const porciones = form.porcionesRinde || 1;
  const macrosPorPorcion = {
    kcal: Math.round(totalKcal / porciones),
    prot: Number((totalProt / porciones).toFixed(1)),
    cho: Number((totalCho / porciones).toFixed(1)),
    grasas: Number((totalGrasas / porciones).toFixed(1)),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIngredients.length === 0) {
      alert('Por favor agrega al menos un ingrediente.');
      return;
    }

    setIsSubmitting(true);
    
    // Formatear ingredientes al esquema esperado por la tabla 'recipes'
    const ingredientesFormatted = selectedIngredients.map(ing => ({
      nombre: ing.nombre,
      cantidad: ing.cantidad, // en gramos
      unidad: 'g',
    }));

    const instrucciones = form.instruccionesText.split('\n').filter(i => i.trim() !== '');

    const { error } = await supabase.from('recipes').insert({
      nombre: form.nombre,
      descripcion: form.descripcion,
      categoria: form.categoria,
      dificultad: form.dificultad,
      tiempo_preparacion_min: form.tiempoPreparacionMin,
      porciones_rinde: form.porcionesRinde,
      ingredientes: ingredientesFormatted,
      instrucciones: instrucciones,
      origen: 'staff',
      macros_por_porcion: macrosPorPorcion,
      datos_nutricionales_avanzados: {
        alergenos: [],
        vitaminas: [],
        aptaParaDietas: [],
        cargaGlicemica: 'media'
      },
      apta_para_condiciones: form.patologia === 'General' ? ['General'] : [form.patologia],
      restricciones: [],
      tags: [],
    });

    setIsSubmitting(false);
    if (!error) {
      alert('Receta creada con éxito!');
      navigate('/staff/dashboard');
    } else {
      console.error(error);
      alert('Error al crear la receta');
    }
  };

  return (
    <div className="w-full mx-auto min-w-0 animate-fade-in pb-12 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-bg-elevated transition-colors cursor-pointer"
          type="button"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <ChefHat className="text-salud-green" /> Crear Nueva Receta
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Añade recetas al catálogo global de la plataforma con cálculo dinámico de macros.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulario Principal (Izquierda) */}
          <div className="lg:col-span-2 space-y-6">
            <Card padding="lg">
              <h2 className="text-lg font-bold mb-4 border-b border-border/40 pb-2">Información General</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Nombre de la Receta</label>
                  <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej. Pechuga de Pollo con Ensalada Verde" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Descripción</label>
                  <Textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} required placeholder="Una descripción breve del plato..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Categoría</label>
                  <Select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                    <option value="desayuno">Desayuno</option>
                    <option value="almuerzo">Almuerzo</option>
                    <option value="cena">Cena</option>
                    <option value="colacion">Colación</option>
                    <option value="snack">Snack</option>
                    <option value="bebida">Bebida</option>
                    <option value="postre_saludable">Postre</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Dificultad</label>
                  <Select value={form.dificultad} onChange={e => setForm({...form, dificultad: e.target.value})}>
                    <option value="facil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="avanzada">Avanzada</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Tiempo Preparación (min)</label>
                  <Input type="number" value={form.tiempoPreparacionMin} onChange={e => setForm({...form, tiempoPreparacionMin: Number(e.target.value)})} min={1} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Porciones que rinde</label>
                  <Input type="number" value={form.porcionesRinde} onChange={e => setForm({...form, porcionesRinde: Number(e.target.value)})} min={1} required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-text-secondary">Patología Recomendada</label>
                  <Select value={form.patologia} onChange={e => setForm({...form, patologia: e.target.value})}>
                    <option value="General">General (Sin patología específica)</option>
                    {condicionesDinamicas.map(cond => (
                      <option key={cond.id} value={cond.valor}>
                        {cond.valor}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* Selector e Ingredientes Agregados */}
            <Card padding="lg">
              <h2 className="text-lg font-bold mb-4 border-b border-border/40 pb-2">Ingredientes de la Receta</h2>
              
              {/* Buscador de Ingredientes */}
              <div className="relative mb-6">
                <label className="block text-sm font-semibold mb-1.5 text-text-secondary">Buscar Ingrediente (desde base de datos de 100g)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search size={18} className="text-text-tertiary" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Escribe para buscar ingredientes (Ej. pollo, arroz, avena...)"
                    className="w-full bg-bg-elevated border border-border/60 rounded-lg py-2.5 pl-10 pr-4 text-text-primary text-sm focus:outline-none focus:border-salud-green transition-colors"
                  />
                  {isSearching && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-salud-green border-t-transparent"></span>
                    </span>
                  )}
                </div>

                {/* Resultados de Búsqueda Flotantes */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-bg-card border border-border/60 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg divide-y divide-border/30">
                    {searchResults.map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(ing)}
                        className="w-full text-left px-4 py-2.5 hover:bg-bg-elevated text-sm transition-colors flex justify-between items-center cursor-pointer"
                      >
                        <span className="font-medium text-text-primary">{ing.nombre}</span>
                        <span className="text-xs text-text-tertiary">
                          {ing.calorias} kcal | P: {ing.proteinas || 0}g | C: {ing.carbohidratos || 0}g
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel de Ajuste del Ingrediente Seleccionado */}
              {activeIngredient && (
                <div className="bg-bg-elevated p-4 rounded-xl border border-salud-green/20 mb-6 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-text-primary text-sm">Ajustar cantidad para:</h4>
                      <p className="text-salud-green font-extrabold text-base">{activeIngredient.nombre}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveIngredient(null)}
                      className="text-text-tertiary hover:text-text-primary text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold mb-1 text-text-secondary">Cantidad (gramos)</label>
                      <Input
                        type="number"
                        value={amountGrams}
                        onChange={(e) => setAmountGrams(Math.max(1, Number(e.target.value)))}
                        min={1}
                        required
                      />
                    </div>
                    
                    {/* Live Preview de los macros del ingrediente actual */}
                    <div className="md:col-span-2 bg-bg-card p-3 rounded-lg border border-border/40 grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="font-extrabold text-salud-red">{Math.round((activeIngredient.calorias * amountGrams) / 100)}</p>
                        <p className="text-[10px] text-text-tertiary">Kcal</p>
                      </div>
                      <div>
                        <p className="font-extrabold text-salud-blue">{(( (activeIngredient.proteinas || 0) * amountGrams) / 100).toFixed(1)}g</p>
                        <p className="text-[10px] text-text-tertiary">Prot</p>
                      </div>
                      <div>
                        <p className="font-extrabold text-salud-amber">{(( (activeIngredient.carbohidratos || 0) * amountGrams) / 100).toFixed(1)}g</p>
                        <p className="text-[10px] text-text-tertiary">Carbs</p>
                      </div>
                      <div>
                        <p className="font-extrabold text-text-primary">{(( (activeIngredient.grasas || 0) * amountGrams) / 100).toFixed(1)}g</p>
                        <p className="text-[10px] text-text-tertiary">Grasas</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddIngredient}
                    icon={<Plus size={16} />}
                    className="w-full py-2 text-xs"
                  >
                    Agregar a la receta
                  </Button>
                </div>
              )}

              {/* Lista de Ingredientes Agregados */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary">Ingredientes añadidos ({selectedIngredients.length})</h3>
                {selectedIngredients.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic p-4 text-center bg-bg-elevated rounded-lg border border-dashed border-border/60">
                    No has agregado ingredientes. Utiliza el buscador de arriba.
                  </p>
                ) : (
                  <div className="divide-y divide-border/30 border border-border/40 rounded-lg overflow-hidden bg-bg-card">
                    {selectedIngredients.map((ing) => {
                      const ingKcal = Math.round((ing.caloriasBase * ing.cantidad) / 100);
                      const ingProt = ((ing.proteinasBase * ing.cantidad) / 100).toFixed(1);
                      const ingCho = ((ing.carbohidratosBase * ing.cantidad) / 100).toFixed(1);
                      const ingGrasas = ((ing.grasasBase * ing.cantidad) / 100).toFixed(1);

                      return (
                        <div key={ing.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 hover:bg-bg-elevated/40 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-text-primary">{ing.nombre}</p>
                            <p className="text-xs text-salud-blue font-semibold mt-0.5">
                              {ing.cantidad}g <span className="text-text-tertiary">({ing.caloriasBase} kcal/100g base)</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4 justify-between sm:justify-end">
                            <div className="grid grid-cols-4 gap-2 text-center text-xs min-w-48 bg-bg-elevated px-3 py-1.5 rounded-md border border-border/30">
                              <div>
                                <p className="font-extrabold text-salud-red text-[11px]">{ingKcal}</p>
                                <p className="text-[9px] text-text-tertiary">Kcal</p>
                              </div>
                              <div>
                                <p className="font-extrabold text-salud-blue text-[11px]">{ingProt}g</p>
                                <p className="text-[9px] text-text-tertiary">Prot</p>
                              </div>
                              <div>
                                <p className="font-extrabold text-salud-amber text-[11px]">{ingCho}g</p>
                                <p className="text-[9px] text-text-tertiary">Carbs</p>
                              </div>
                              <div>
                                <p className="font-extrabold text-text-primary text-[11px]">{ingGrasas}g</p>
                                <p className="text-[9px] text-text-tertiary">Grasas</p>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(ing.id)}
                              className="p-1.5 rounded-md text-text-tertiary hover:text-salud-red hover:bg-salud-red-soft/30 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Instrucciones de Preparación */}
            <Card padding="lg">
              <h2 className="text-lg font-bold mb-4 border-b border-border/40 pb-2">Instrucciones de Preparación</h2>
              <div>
                <label className="block text-sm font-semibold mb-1 text-text-secondary">Instrucciones (Una por línea / Un paso por línea)</label>
                <Textarea
                  rows={5}
                  value={form.instruccionesText}
                  onChange={e => setForm({...form, instruccionesText: e.target.value})}
                  placeholder="Ej:&#10;Paso 1: Cocinar el pollo en una sartén.&#10;Paso 2: Mezclar los vegetales con el aderezo.&#10;Paso 3: Servir decorado con las semillas."
                  required
                />
              </div>
            </Card>
          </div>

          {/* Resumen de Macronutrientes (Derecha) */}
          <div className="lg:col-span-1 space-y-6">
            <Card padding="lg" className="sticky top-6 bg-gradient-to-br from-bg-card to-bg-elevated border-salud-green/10">
              <h3 className="text-base font-extrabold text-text-primary mb-4 pb-2 border-b border-border/40 flex items-center gap-2">
                📊 Información Nutricional
              </h3>

              {/* Calorías Totales */}
              <div className="mb-6 p-4 bg-salud-green-soft/20 rounded-xl border border-salud-green/10 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-salud-green block">Calorías Totales</span>
                <span className="text-3xl font-extrabold text-text-primary mt-1 block">
                  {Math.round(totalKcal)} <span className="text-lg font-bold text-text-secondary">kcal</span>
                </span>
                <span className="text-xs text-text-secondary mt-1.5 block">
                  Por porción ({porciones} porc.): <b className="text-text-primary">{macrosPorPorcion.kcal} kcal</b>
                </span>
              </div>

              {/* Macros Totales y Por Porción */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Resumen de Macronutrientes</h4>
                
                {/* Proteínas */}
                <div className="flex justify-between items-center border-b border-border/20 pb-2">
                  <div>
                    <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-salud-blue" />
                      Proteínas
                    </p>
                    <p className="text-xs text-text-tertiary">Por porción: {macrosPorPorcion.prot}g</p>
                  </div>
                  <p className="text-sm font-extrabold text-text-primary">{totalProt.toFixed(1)} g</p>
                </div>

                {/* Carbohidratos */}
                <div className="flex justify-between items-center border-b border-border/20 pb-2">
                  <div>
                    <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-salud-amber" />
                      Carbohidratos
                    </p>
                    <p className="text-xs text-text-tertiary">Por porción: {macrosPorPorcion.cho}g</p>
                  </div>
                  <p className="text-sm font-extrabold text-text-primary">{totalCho.toFixed(1)} g</p>
                </div>

                {/* Grasas */}
                <div className="flex justify-between items-center border-b border-border/20 pb-2">
                  <div>
                    <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-text-secondary" />
                      Grasas
                    </p>
                    <p className="text-xs text-text-tertiary">Por porción: {macrosPorPorcion.grasas}g</p>
                  </div>
                  <p className="text-sm font-extrabold text-text-primary">{totalGrasas.toFixed(1)} g</p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-6 space-y-3">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting || selectedIngredients.length === 0}
                  icon={<Save size={18} />}
                  className="w-full justify-center"
                >
                  {isSubmitting ? 'Guardando Receta...' : 'Guardar Receta'}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full justify-center border border-border/40 hover:bg-bg-elevated/40"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>

        </div>
      </form>
    </div>
  );
}
