import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, X, ChevronRight, FlaskConical, Boxes, Clock, List, DollarSign } from 'lucide-react';

export default function Production() {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [orderStartTime, setOrderStartTime] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [materialForm, setMaterialForm] = useState({ name: '', sku: '', current_stock: '', min_stock: '', unit: 'kg', cost_per_unit: '', supplier: '' });
  const [recipeForm, setRecipeForm] = useState({ name: '', description: '', output_product_id: '', output_product_name: '', expected_quantity: '', ingredients: [] });
  const [newIngredient, setNewIngredient] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg' });

  const loadData = async () => {
    const [o, r, m, p] = await Promise.all([
      api.get('/production-orders'), api.get('/recipes'), api.get('/raw-materials'), api.get('/products')
    ]);
    setOrders(o.data); setRecipes(r.data); setRawMaterials(m.data); setProducts(p.data);
  };
  useEffect(() => { loadData(); }, []);

  const createOrder = async () => {
    const recipe = recipes.find((r) => r.id === selectedRecipe);
    if (!recipe) return;
    await api.post('/production-orders', { recipe_id: recipe.id, recipe_name: recipe.name, start_time: orderStartTime || null });
    setShowOrderForm(false); setSelectedRecipe(''); setOrderStartTime(''); loadData();
  };

  const advanceOrder = async (orderId, newStage) => {
    const updateData = { stage: newStage };
    if (newStage === 'terminada') updateData.end_time = new Date().toISOString();
    await api.put(`/production-orders/${orderId}`, updateData);
    loadData();
  };

  const createRecipe = async (e) => {
    e.preventDefault();
    await api.post('/recipes', { ...recipeForm, expected_quantity: parseInt(recipeForm.expected_quantity), ingredients: recipeForm.ingredients });
    setShowRecipeForm(false); setRecipeForm({ name: '', description: '', output_product_id: '', output_product_name: '', expected_quantity: '', ingredients: [] }); loadData();
  };

  const addIngredient = () => {
    if (!newIngredient.raw_material_id || !newIngredient.quantity) return;
    setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { ...newIngredient, quantity: parseFloat(newIngredient.quantity) }] });
    setNewIngredient({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg' });
  };

  const createMaterial = async (e) => {
    e.preventDefault();
    await api.post('/raw-materials', { ...materialForm, current_stock: parseFloat(materialForm.current_stock), min_stock: parseFloat(materialForm.min_stock), cost_per_unit: parseFloat(materialForm.cost_per_unit) });
    setShowMaterialForm(false); setMaterialForm({ name: '', sku: '', current_stock: '', min_stock: '', unit: 'kg', cost_per_unit: '', supplier: '' }); loadData();
  };

  const stages = ['montada', 'alistada', 'procesada', 'terminada'];
  const stageColors = { montada: 'badge-blue', alistada: 'badge-yellow', procesada: 'badge-purple', terminada: 'badge-green' };
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
          <p className="text-xs font-semibold text-gray-500 tracking-wider">ALISTADAS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.alistada?.length || 0}</p>
        </div>
        <div className="glass-card p-4 stat-purple">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">EN PROCESO</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.procesada?.length || 0}</p>
        </div>
        <div className="glass-card p-4 stat-green">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">TERMINADAS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ordersByStage.terminada?.length || 0}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('orders')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'orders' ? 'tab-active' : 'tab-inactive'}`}>Órdenes</button>
        <button onClick={() => setTab('recipes')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'recipes' ? 'tab-active' : 'tab-inactive'}`}>Recetas/Kits</button>
        <button onClick={() => setTab('materials')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'materials' ? 'tab-active' : 'tab-inactive'}`}>Materias Primas</button>
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
                            <p className="font-bold text-gray-800">{o.recipe_name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                              <span>{new Date(o.created_at).toLocaleString('es-CO')}</span>
                              {o.start_time && <span className="flex items-center gap-1"><Clock size={12} /> Inicio: {new Date(o.start_time).toLocaleString('es-CO')}</span>}
                              {o.end_time && <span className="flex items-center gap-1"><Clock size={12} /> Fin: {new Date(o.end_time).toLocaleString('es-CO')}</span>}
                            </div>
                          </div>
                          {/* Progress indicator */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {stages.map((s, i) => (
                              <div key={s} className={`w-6 h-1.5 rounded-full ${i <= currentIdx ? 'bg-primary-500' : 'bg-gray-200'}`} />
                            ))}
                          </div>
                          <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className="p-2 rounded-lg hover:bg-gray-100">
                            <List size={16} className="text-gray-500" />
                          </button>
                          {nextStage && (
                            <button onClick={() => advanceOrder(o.id, nextStage)} className="btn-primary text-xs px-3 py-1.5">
                              <ChevronRight size={14} /> {nextStage}
                            </button>
                          )}
                        </div>
                        {/* Expanded details: materials list */}
                        {isExpanded && recipe && (
                          <div className="px-4 pb-4 border-t border-gray-100 animate-fade-in">
                            <p className="text-xs font-semibold text-gray-400 tracking-wider mt-3 mb-2">MATERIALES REQUERIDOS</p>
                            <div className="space-y-1.5">
                              {(recipe.ingredients || []).map((ing, i) => {
                                const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
                                const ingredientCost = ing.quantity * (mat?.cost_per_unit || 0);
                                return (
                                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                                    <Boxes size={14} className="text-primary-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700 flex-1">{ing.raw_material_name}</span>
                                    <span className="text-gray-500">{ing.quantity} {ing.unit}</span>
                                    <span className="text-xs text-gray-400">× {fmt(mat?.cost_per_unit || 0)}</span>
                                    <span className="font-bold text-primary-600 text-xs">{fmt(ingredientCost)}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                              <span className="text-sm font-semibold text-gray-600">Costo Total Kit</span>
                              <span className="text-lg font-bold text-primary-600">{fmt(calcKitCost(recipe))}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.length === 0 ? <p className="text-gray-400 col-span-2 text-center py-8 glass-card">No hay recetas</p> : recipes.map((r) => {
            const kitCost = calcKitCost(r);
            return (
              <div key={r.id} className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={18} className="text-primary-600" />
                    <p className="font-bold text-gray-800">{r.name}</p>
                  </div>
                  {kitCost > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign size={14} className="text-primary-500" />
                      <span className="font-bold text-primary-600">{fmt(kitCost)}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">Produce: {r.output_product_name} × {r.expected_quantity}</p>
                {r.ingredients?.length > 0 && (
                  <div className="space-y-1 border-t border-gray-100 pt-2">
                    <p className="text-xs font-semibold text-gray-400 tracking-wider">INGREDIENTES</p>
                    {r.ingredients.map((ing, i) => {
                      const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
                      const cost = ing.quantity * (mat?.cost_per_unit || 0);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">• {ing.raw_material_name}: {ing.quantity} {ing.unit}</span>
                          {cost > 0 && <span className="text-gray-500 font-medium">{fmt(cost)}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'materials' && (
        <div className="glass-card overflow-hidden">
          {rawMaterials.length === 0 ? <p className="text-gray-400 text-center py-8">No hay materias primas</p> : rawMaterials.map((m) => (
            <div key={m.id} className="data-row gap-4">
              <Boxes size={20} className="text-primary-400 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-5 gap-4">
                <div><p className="text-xs text-gray-400 font-semibold tracking-wider">NOMBRE</p><p className="font-bold text-sm text-gray-800">{m.name}</p></div>
                <div><p className="text-xs text-gray-400 font-semibold tracking-wider">SKU</p><p className="font-bold text-sm text-gray-800">{m.sku}</p></div>
                <div><p className="text-xs text-gray-400 font-semibold tracking-wider">STOCK</p><p className={`font-bold text-sm ${m.current_stock <= m.min_stock ? 'text-red-600' : 'text-gray-800'}`}>{m.current_stock} / {m.min_stock} {m.unit}</p></div>
                <div><p className="text-xs text-gray-400 font-semibold tracking-wider">COSTO/U</p><p className="font-bold text-sm text-primary-600">{fmt(m.cost_per_unit)}</p></div>
                <div><p className="text-xs text-gray-400 font-semibold tracking-wider">PROVEEDOR</p><p className="font-bold text-sm text-gray-800">{m.supplier || '—'}</p></div>
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
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Receta</label>
                <select value={selectedRecipe} onChange={(e) => setSelectedRecipe(e.target.value)}>
                  <option value="">Seleccionar receta...</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Hora de Inicio (opcional)</label>
                <input type="datetime-local" value={orderStartTime} onChange={(e) => setOrderStartTime(e.target.value)} />
              </div>
              {selectedRecipe && (() => {
                const recipe = recipes.find(r => r.id === selectedRecipe);
                return recipe?.ingredients?.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 tracking-wider mb-2">MATERIALES REQUERIDOS</p>
                    {recipe.ingredients.map((ing, i) => (
                      <p key={i} className="text-xs text-gray-600">• {ing.raw_material_name}: {ing.quantity} {ing.unit}</p>
                    ))}
                    <p className="text-sm font-bold text-primary-600 mt-2">Costo: {fmt(calcKitCost(recipe))}</p>
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowOrderForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={createOrder} className="flex-1 btn-primary justify-center py-2.5">Crear Orden</button>
            </div>
          </div>
        </div>
      )}

      {/* New Recipe Modal */}
      {showRecipeForm && (
        <div className="modal-overlay" onClick={() => setShowRecipeForm(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Nueva Receta</h3><button onClick={() => setShowRecipeForm(false)}><X size={20} /></button></div>
            <form onSubmit={createRecipe} className="space-y-3">
              <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-semibold mb-1">Producto Resultado</label>
                <select value={recipeForm.output_product_id} onChange={(e) => { const p = products.find((x) => x.id === e.target.value); setRecipeForm({ ...recipeForm, output_product_id: e.target.value, output_product_name: p?.name || '' }); }} required>
                  <option value="">Seleccionar...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-semibold mb-1">Cantidad a Producir</label><input type="number" value={recipeForm.expected_quantity} onChange={(e) => setRecipeForm({ ...recipeForm, expected_quantity: e.target.value })} required /></div>
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
              <button type="submit" className="btn-primary w-full justify-center py-2.5">Crear</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
