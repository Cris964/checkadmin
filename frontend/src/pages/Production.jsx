import { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { Plus, X, ChevronRight, FlaskConical, Boxes, Clock, List, DollarSign } from 'lucide-react';

export default function Production() {
  const [tab, setTab] = useState('materials');
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [materialForm, setMaterialForm] = useState({ name: '', sku: '', current_stock: '', min_stock: '', unit: 'kg', cost_per_unit: '', supplier: '', lote: '', vencimiento: '' });
  const [recipeForm, setRecipeForm] = useState({ cliente: '', description: '', output_product_id: '', output_product_name: '', expected_quantity: '', image_url: '', ingredients: [] });
  const [newIngredient, setNewIngredient] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg' });

  const loadData = async () => {
    const [o, r, m, p, w] = await Promise.all([
      api.get('/production-orders'), api.get('/recipes'), api.get('/raw-materials'), api.get('/products'), api.get('/warehouses')
    ]);
    setOrders(o.data); setRecipes(r.data); setRawMaterials(m.data); setProducts(p.data); setWarehouses(w.data);
  };
  useEffect(() => { loadData(); }, []);

  const createOrder = async () => {
    const recipe = recipes.find((r) => r.id === selectedRecipe);
    if (!recipe) { toast.error('Selecciona una receta'); return; }
    await api.post('/production-orders', { 
      recipe_id: recipe.id, 
      recipe_name: recipe.output_product_name, 
      quantity: parseInt(orderQuantity),
      warehouse_id: selectedWarehouse || null,
      start_time: new Date().toISOString()
    });
    setShowOrderForm(false); setSelectedRecipe(''); setOrderQuantity(1); setSelectedWarehouse(''); loadData();
    toast.success('Orden de producción creada');
  };

  const advanceOrder = async (orderId, newStage) => {
    const updateData = { stage: newStage };
    if (newStage === 'procesamiento') {
      const nov = prompt("Ingrese novedades o notas para el procesamiento (opcional):");
      if (nov !== null) updateData.novedades = nov;
    }
    if (newStage === 'terminada') {
      updateData.end_time = new Date().toISOString();
      const actual = prompt("Cantidad final producida:", orders.find(o => o.id === orderId)?.quantity || 1);
      if (actual) updateData.actual_output = parseInt(actual);
    }
    await api.put(`/production-orders/${orderId}`, updateData);
    loadData();
    toast.info(`Orden avanzada a etapa: ${newStage}`);
  };

  const createRecipe = async (e) => {
    e.preventDefault();
    if (editingRecipe) {
      await api.put(`/recipes/${editingRecipe.id}`, { ...recipeForm, expected_quantity: parseInt(recipeForm.expected_quantity) });
      toast.success('Receta actualizada correctamente');
    } else {
      await api.post('/recipes', { ...recipeForm, expected_quantity: parseInt(recipeForm.expected_quantity) });
      toast.success('Receta/Kit creado correctamente');
    }
    setShowRecipeForm(false); setEditingRecipe(null); 
    setRecipeForm({ cliente: '', description: '', output_product_id: '', output_product_name: '', expected_quantity: '', image_url: '', ingredients: [] }); 
    loadData();
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeForm({
      cliente: recipe.cliente || '',
      description: recipe.description || '',
      output_product_id: recipe.output_product_id,
      output_product_name: recipe.output_product_name,
      expected_quantity: recipe.expected_quantity,
      image_url: recipe.image_url || '',
      ingredients: recipe.ingredients || []
    });
    setShowRecipeForm(true);
  };

  const addIngredient = () => {
    if (!newIngredient.raw_material_id || !newIngredient.quantity) return;
    setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { ...newIngredient, quantity: parseFloat(newIngredient.quantity) }] });
    setNewIngredient({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg' });
  };

  const createMaterial = async (e) => {
    e.preventDefault();
    await api.post('/raw-materials', { 
      ...materialForm, 
      current_stock: parseFloat(materialForm.current_stock), 
      min_stock: parseFloat(materialForm.min_stock), 
      cost_per_unit: parseFloat(materialForm.cost_per_unit) 
    });
    setShowMaterialForm(false); 
    setMaterialForm({ name: '', sku: '', current_stock: '', min_stock: '', unit: 'kg', cost_per_unit: '', supplier: '', lote: '', vencimiento: '' }); 
    loadData();
    toast.success('Materia prima registrada');
  };

  const stages = ['montada', 'alistamiento', 'procesamiento', 'terminada'];
  const stageColors = { montada: 'badge-blue', alistamiento: 'badge-yellow', procesamiento: 'badge-purple', terminada: 'badge-green' };
  const stageIdx = (stage) => stages.indexOf(stage);

  const getRecipeForOrder = (order) => recipes.find(r => r.id === order.recipe_id);
  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`;

  // Calculate kit cost
  const calcKitCost = (recipe) => {
    if (!recipe?.ingredients) return 0;
    return recipe.ingredients.reduce((total, ing) => {
      const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
      return total + (ing.quantity * (mat?.cost_per_unit || 0));
    }, 0);
  };

  // Group orders by stage
  const ordersByStage = stages.reduce((acc, stage) => {
    acc[stage] = orders.filter(o => o.stage === stage);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Producción</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">GESTIÓN COMPLETA DE PRODUCCIÓN</p>
        </div>
        {tab === 'orders' && <button onClick={() => setShowOrderForm(true)} className="btn-primary"><Plus size={16} /> Nueva Orden</button>}
        {tab === 'recipes' && <button onClick={() => setShowRecipeForm(true)} className="btn-primary"><Plus size={16} /> Nueva Receta</button>}
        {tab === 'materials' && <button onClick={() => setShowMaterialForm(true)} className="btn-primary"><Plus size={16} /> Nueva Materia Prima</button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 stat-blue">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">MONTADAS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.montada?.length || 0}</p>
        </div>
        <div className="glass-card p-4 stat-yellow">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">ALISTAMIENTO</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.alistamiento?.length || 0}</p>
        </div>
        <div className="glass-card p-4 stat-purple">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">PROCESAMIENTO</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.procesamiento?.length || 0}</p>
        </div>
        <div className="glass-card p-4 stat-green">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">TERMINADAS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.terminada?.length || 0}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('materials')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'materials' ? 'tab-active' : 'tab-inactive'}`}>Materias Primas</button>
        <button onClick={() => setTab('recipes')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'recipes' ? 'tab-active' : 'tab-inactive'}`}>Recetas/Kits</button>
        <button onClick={() => setTab('orders')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'orders' ? 'tab-active' : 'tab-inactive'}`}>Órdenes</button>
      </div>

      {tab === 'orders' && (
        <div className="space-y-6">
          {/* Stage Segmented View */}
          {stages.map(stage => (
            ordersByStage[stage]?.length > 0 && (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`badge ${stageColors[stage]}`}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
                  <span className="text-xs text-gray-400">{ordersByStage[stage].length} órdenes</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="space-y-2">
                  {ordersByStage[stage].map((o) => {
                    const currentIdx = stageIdx(o.stage);
                    const nextStage = stages[currentIdx + 1];
                    const recipe = getRecipeForOrder(o);
                    const isExpanded = expandedOrder === o.id;
                    return (
                      <div key={o.id} className="glass-card overflow-hidden">
                        <div className="flex items-center gap-4 p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-800 text-lg">{o.recipe_name}</p>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Cant: {o.quantity}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 mt-1">
                              <span className="flex items-center gap-1 font-medium text-blue-500"><User size={12} /> {o.created_by || 'Sistema'}</span>
                              <span className="flex items-center gap-1"><Home size={12} /> {o.warehouse_id ? warehouses.find(w => w.id === o.warehouse_id)?.name : 'Sin bodega'}</span>
                              <span>{new Date(o.created_at).toLocaleString('es-CO')}</span>
                              {o.start_time && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(o.start_time).toLocaleTimeString('es-CO')}</span>}
                            </div>
                            {o.novedades && (
                              <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 text-xs text-yellow-800 italic">
                                <strong>Novedades:</strong> {o.novedades}
                              </div>
                            )}
                          </div>
                          {/* Progress indicator */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {stages.map((s, i) => (
                              <div key={s} className={`w-8 h-2 rounded-full ${i <= currentIdx ? 'bg-primary-500' : 'bg-gray-200'}`} title={s} />
                            ))}
                          </div>
                          <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                            <List size={20} />
                          </button>
                          {nextStage && (
                            <button onClick={() => advanceOrder(o.id, nextStage)} className="btn-primary text-xs px-4 py-2 font-bold uppercase tracking-wider">
                              {nextStage} <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                        {/* Expanded details: materials list */}
                        {isExpanded && recipe && (
                          <div className="px-4 pb-4 border-t border-gray-100 animate-fade-in bg-gray-50/50">
                            <div className="flex justify-between items-center mt-3 mb-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lista de Alistamiento (Pre-alistador)</p>
                              {o.stage === 'montada' && (
                                <span className="text-[10px] font-bold text-red-500 animate-pulse">VERIFICAR STOCK</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(recipe.ingredients || []).map((ing, i) => {
                                const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
                                const neededQty = (ing.quantity * o.quantity / recipe.expected_quantity);
                                const hasStock = mat ? mat.current_stock >= neededQty : false;
                                const ingredientCost = neededQty * (mat?.cost_per_unit || 0);
                                return (
                                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border text-sm transition-colors ${hasStock ? 'bg-white border-gray-100' : 'bg-red-50 border-red-200 text-red-900'}`}>
                                    <div className={`p-1.5 rounded-md ${hasStock ? 'bg-primary-50 text-primary-500' : 'bg-red-100 text-red-500'}`}>
                                      <Boxes size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold truncate">{ing.raw_material_name}</p>
                                      <p className={`text-[10px] ${hasStock ? 'text-gray-400' : 'text-red-500 font-bold'}`}>
                                        Stock: {mat?.current_stock || 0} / Requerido: {neededQty.toFixed(2)} {ing.unit}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-xs">{fmt(ingredientCost)}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-[10px] text-gray-400 font-bold">COSTO TOTAL ESTIMADO</p>
                                  <p className="text-xl font-black text-primary-600">{fmt(calcKitCost(recipe) * o.quantity / recipe.expected_quantity)}</p>
                                </div>
                              </div>
                              <button className="btn-secondary text-xs px-4 font-bold border-2">IMPRIMIR PICKING</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
          {orders.length === 0 && <div className="glass-card p-12 text-center"><p className="text-gray-400">No hay órdenes de producción</p></div>}
        </div>
      )}

      {tab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.length === 0 ? <p className="text-gray-400 col-span-full text-center py-8 glass-card">No hay recetas</p> : recipes.map((r) => {
            const kitCost = calcKitCost(r);
            return (
              <div key={r.id} className="glass-card overflow-hidden border-t-4 border-blue-500 hover:shadow-lg transition-shadow">
                {r.image_url && (
                  <div className="h-40 w-full overflow-hidden bg-gray-100">
                    <img src={r.image_url} alt={r.output_product_name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={18} className="text-primary-600" />
                      <div>
                        <p className="font-bold text-gray-800 text-lg leading-tight">{r.output_product_name}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">Cliente: {r.cliente || 'Genérico'}</p>
                      </div>
                    </div>
                    {kitCost > 0 && (
                      <div className="flex items-center gap-1 text-sm bg-primary-50 px-2 py-1 rounded-full">
                        <DollarSign size={14} className="text-primary-500" />
                        <span className="font-bold text-primary-600">{fmt(kitCost)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{r.description || 'Sin descripción'}</p>
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingredientes Principales</p>
                    {r.ingredients?.slice(0, 3).map((ing, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">• {ing.raw_material_name}</span>
                        <span className="text-gray-500 font-medium">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                    {r.ingredients?.length > 3 && <p className="text-xs text-gray-400">+{r.ingredients.length - 3} más...</p>}
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-4">
                    <button className="flex-1 btn-secondary py-2 text-xs">Detalles</button>
                    <button onClick={() => handleEditRecipe(r)} className="btn-secondary py-2 px-4 text-xs">Editar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'materials' && (
        <div className="glass-card overflow-hidden">
          {rawMaterials.length === 0 ? <p className="text-gray-400 text-center py-8">No hay materias primas</p> : rawMaterials.map((m) => (
            <div key={m.id} className="data-row gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <Boxes size={22} className="text-primary-400 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-4 py-3">
                <div className="col-span-1 md:col-span-2"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nombre</p><p className="font-bold text-sm text-gray-800">{m.name}</p><p className="text-xs text-gray-500">{m.sku}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stock</p><p className={`font-bold text-sm ${m.current_stock <= m.min_stock ? 'text-red-600' : 'text-green-600'}`}>{m.current_stock} {m.unit}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lote</p><p className="font-medium text-xs text-gray-700">{m.lote || '—'}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vence</p><p className="font-medium text-xs text-gray-700">{m.vencimiento || '—'}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Costo/U</p><p className="font-bold text-sm text-primary-600">{fmt(m.cost_per_unit)}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Proveedor</p><p className="font-medium text-xs text-gray-600 truncate">{m.supplier || '—'}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Order Modal */}
      {showOrderForm && (
        <div className="modal-overlay" onClick={() => setShowOrderForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Nueva Orden de Producción</h3><button onClick={() => setShowOrderForm(false)}><X size={20} /></button></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Receta / Kit a Producir</label>
                <select 
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedRecipe} 
                  onChange={(e) => setSelectedRecipe(e.target.value)}
                >
                  <option value="">Seleccionar receta...</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.output_product_name} ({r.cliente || 'Genérico'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad a Producir</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={orderQuantity} 
                    onChange={(e) => setOrderQuantity(e.target.value)} 
                    min="1" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bodega de Destino</label>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={selectedWarehouse} 
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                  >
                    <option value="">Seleccionar bodega...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              {selectedRecipe && (() => {
                const recipe = recipes.find(r => r.id === selectedRecipe);
                return recipe?.ingredients?.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Resumen de Materiales ({orderQuantity} cant.)</p>
                    <div className="space-y-1">
                      {recipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex justify-between text-xs text-blue-800">
                          <span>{ing.raw_material_name}</span>
                          <span className="font-bold">{(ing.quantity * orderQuantity / recipe.expected_quantity).toFixed(2)} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowOrderForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button 
                onClick={createOrder} 
                className="flex-1 btn-primary justify-center py-2.5 font-bold uppercase tracking-wider"
                disabled={!selectedRecipe}
              >
                Crear Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Recipe Modal */}
      {showRecipeForm && (
        <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold">{editingRecipe ? 'Editar Receta/Kit' : 'Nueva Receta/Kit'}</h3>
              <button onClick={() => { setShowRecipeForm(false); setEditingRecipe(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={createRecipe} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Producto Final (Resultado)</label>
                  <select 
                    value={recipeForm.output_product_id} 
                    onChange={(e) => { 
                      const p = products.find((x) => x.id === e.target.value); 
                      setRecipeForm({ ...recipeForm, output_product_id: e.target.value, output_product_name: p?.name || '' }); 
                    }} 
                    required
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Cliente</label>
                  <input 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={recipeForm.cliente} 
                    onChange={(e) => setRecipeForm({ ...recipeForm, cliente: e.target.value })} 
                    placeholder="Ej: Éxito" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Cant. Esperada</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={recipeForm.expected_quantity} 
                    onChange={(e) => setRecipeForm({ ...recipeForm, expected_quantity: e.target.value })} 
                    required 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">URL Foto Producto</label>
                  <input 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={recipeForm.image_url} 
                    onChange={(e) => setRecipeForm({ ...recipeForm, image_url: e.target.value })} 
                    placeholder="https://..." 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Descripción</label>
                  <textarea 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={recipeForm.description} 
                    onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })} 
                    rows="2" 
                  />
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">Ingredientes ({recipeForm.ingredients.length})</p>
                {recipeForm.ingredients.map((ing, i) => {
                  const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
                  return <p key={i} className="text-xs text-gray-600">• {ing.raw_material_name}: {ing.quantity} {ing.unit} — {fmt(ing.quantity * (mat?.cost_per_unit || 0))}</p>;
                })}
                <div className="flex gap-2 mt-2">
                  <select value={newIngredient.raw_material_id} onChange={(e) => { const m = rawMaterials.find((x) => x.id === e.target.value); setNewIngredient({ ...newIngredient, raw_material_id: e.target.value, raw_material_name: m?.name || '', unit: m?.unit || 'kg' }); }} className="flex-1">
                    <option value="">Material...</option>{rawMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="number" placeholder="Cant." value={newIngredient.quantity} onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })} className="w-20" />
                  <button type="button" onClick={addIngredient} className="btn-primary text-xs px-3"><Plus size={14} /></button>
                </div>
                {recipeForm.ingredients.length > 0 && (
                  <p className="text-sm font-bold text-primary-600 mt-3">Costo total del kit: {fmt(recipeForm.ingredients.reduce((acc, ing) => {
                    const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
                    return acc + (ing.quantity * (mat?.cost_per_unit || 0));
                  }, 0))}</p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">Crear Receta</button>
            </form>
          </div>
        </div>
      )}

      {/* New Material Modal */}
      {showMaterialForm && (
        <div className="modal-overlay" onClick={() => setShowMaterialForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Nueva Materia Prima</h3><button onClick={() => setShowMaterialForm(false)}><X size={20} /></button></div>
            <form onSubmit={createMaterial} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">SKU</label><input value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Stock Actual</label><input type="number" value={materialForm.current_stock} onChange={(e) => setMaterialForm({ ...materialForm, current_stock: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Stock Mín.</label><input type="number" value={materialForm.min_stock} onChange={(e) => setMaterialForm({ ...materialForm, min_stock: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Unidad</label>
                  <select value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}>{['kg','g','L','ml','unidades'].map((u) => <option key={u}>{u}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Costo/Unidad</label><input type="number" step="0.01" value={materialForm.cost_per_unit} onChange={(e) => setMaterialForm({ ...materialForm, cost_per_unit: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Proveedor</label><input value={materialForm.supplier} onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-2">
                <div><label className="block text-sm font-semibold mb-1">Lote</label><input value={materialForm.lote} onChange={(e) => setMaterialForm({ ...materialForm, lote: e.target.value })} placeholder="Ej: L-2024-001" /></div>
                <div><label className="block text-sm font-semibold mb-1">Vencimiento</label><input type="date" value={materialForm.vencimiento} onChange={(e) => setMaterialForm({ ...materialForm, vencimiento: e.target.value })} /></div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">Registrar Materia Prima</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
