import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { getAssetUrl } from '../lib/api';
import { toast } from 'sonner';
import { Plus, X, ChevronRight, FlaskConical, Boxes, Clock, List, DollarSign, User, Home, Edit2, Trash2, Search, Printer } from 'lucide-react';
import OrderPrintView from '../components/OrderPrintView';

const OrderCard = ({ o, stages, stageColors, stageIdx, getRecipeForOrder, recipes, rawMaterials, advanceOrder, setAdvancingOrder, expandedOrder, setExpandedOrder, warehouses, fmt, setPrintingOrder }) => {
  const [localChecklist, setLocalChecklist] = useState([]);
  const [responsable, setResponsable] = useState('');
  const [observations, setObservations] = useState('');

  if (!o) return null;
  const currentIdx = stageIdx(o.stage);
  const nextStage = stages[currentIdx + 1];
  const recipe = getRecipeForOrder(o);
  const isExpanded = expandedOrder === o.id;

  useEffect(() => {
    if (isExpanded && o) {
      if (o.stage === 'alistamiento' || o.stage === 'montada') {
        const saved = o.checklist_alistamiento || [];
        setLocalChecklist(saved.filter(item => item.checked).map(item => item.material_id));
        setResponsable(o.responsable_alistamiento || '');
      } else if (o.stage === 'procesamiento') {
        const saved = o.checklist_procesamiento || [];
        setLocalChecklist(saved.filter(item => item.checked).map(item => item.task));
        setResponsable(o.responsable_procesamiento || '');
        setObservations(o.novedades || '');
      }
    }
  }, [isExpanded, o]);

  return (
    <div key={o.id} className="glass-card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800 text-lg">{o.recipe_name}</p>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Cant: {o.quantity || 1}</span>
            {o.order_number && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold border border-blue-200">{o.order_number}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 mt-1">
            <span className="flex items-center gap-1 font-medium text-blue-500"><User size={12} /> {o.created_by || 'Sistema'}</span>
            <span className="flex items-center gap-1"><Home size={12} /> {o.warehouse_id ? (warehouses || []).find(w => w.id === o.warehouse_id)?.name : 'Sin bodega'}</span>
            <span>{new Date(o.created_at).toLocaleString('es-CO')}</span>
            {o.start_time && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(o.start_time).toLocaleTimeString('es-CO')}</span>}
            {o.product_type && <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">TIPO: {o.product_type}</span>}
            {o.lote && <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">LOTE: {o.lote}</span>}
            {o.vencimiento && <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">VENCE: {o.vencimiento}</span>}
          </div>
          {o.novedades && (
            <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 text-xs text-yellow-800 italic">
              <strong>Novedades:</strong> {o.novedades}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {(stages || []).map((s, i) => (
            <div key={s} className={`w-8 h-2 rounded-full ${i <= currentIdx ? 'bg-primary-500' : 'bg-gray-200'}`} title={s} />
          ))}
        </div>
        <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100 text-gray-400'}`}>
          <List size={20} />
        </button>

        <button onClick={() => setPrintingOrder(o)} className={`p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-400`} title="Imprimir Orden (F-PN-013)">
          <Printer size={20} />
        </button>

        {nextStage && o.stage === 'montada' && (
          <button onClick={() => setAdvancingOrder({ order: o, nextStage })} className="btn-primary text-xs px-4 py-2 font-bold uppercase tracking-wider">
            Alimentar <ChevronRight size={14} />
          </button>
        )}
      </div>
      {isExpanded && recipe && (
        <div className="px-4 pb-4 border-t border-gray-100 animate-fade-in bg-gray-50/50">
          <div className="mb-4 flex flex-wrap gap-4 items-start bg-white p-3 rounded-lg border border-gray-200">
            {recipe.image_url && <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-1">PRODUCTO</p><img src={getAssetUrl(recipe.image_url)} alt="Producto" className="w-16 h-16 object-cover rounded shadow" /></div>}
            {recipe.label_image_url && <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-1">ETIQUETA</p><img src={getAssetUrl(recipe.label_image_url)} alt="Etiqueta" className="w-16 h-16 object-cover rounded shadow" /></div>}
            {recipe.box_image_url && <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-1">CAJA</p><img src={getAssetUrl(recipe.box_image_url)} alt="Caja" className="w-16 h-16 object-cover rounded shadow" /></div>}
            {recipe.internal_coding && <div className="ml-auto"><p className="text-[10px] font-bold text-gray-400 mb-1">CÓDIGO INTERNO</p><span className="font-mono bg-gray-100 p-1 rounded text-sm">{recipe.internal_coding}</span></div>}
          </div>
          {(o.stage === 'alistamiento' || o.stage === 'montada') && (
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LISTA DE ALISTAMIENTO (PRE-ALISTADOR)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(recipe.ingredients || []).map((ing, i) => {
                  const orderQty = parseFloat(o.quantity) || 1;
                  const recipeIngQty = parseFloat(ing.quantity) || 0;
                  const recipeExpQty = parseFloat(recipe.expected_quantity) || 1;
                  const neededQty = (recipeIngQty * orderQty) / recipeExpQty;
                  const mat = (rawMaterials || []).find(m => m.id === ing.raw_material_id);
                  const hasStock = mat ? (parseFloat(mat.current_stock) || 0) >= neededQty : false;
                  const isChecked = localChecklist.includes(ing.raw_material_id);

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        if (!hasStock && !isChecked) {
                          const faltante = isNaN(neededQty) ? '0.00' : (neededQty - (parseFloat(mat?.current_stock) || 0)).toFixed(2);
                          toast.error(`Stock insuficiente de ${ing.raw_material_name}. Faltan ${faltante} ${ing.unit}.`);
                          return;
                        }
                        if (isChecked) setLocalChecklist(localChecklist.filter(id => id !== ing.raw_material_id));
                        else setLocalChecklist([...localChecklist, ing.raw_material_id]);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'bg-green-50 border-green-500' : hasStock ? 'bg-white border-gray-100' : 'bg-red-50 border-red-500 opacity-90'}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-green-500 border-green-500 text-white' : hasStock ? 'border-gray-300' : 'border-red-300 bg-red-100'}`}>
                        {isChecked && '✓'}
                        {!isChecked && !hasStock && <span className="text-[10px] text-red-500 font-bold">X</span>}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{ing.raw_material_name}</p>
                        <p className={`text-[10px] font-medium ${hasStock ? 'text-gray-500' : 'text-red-600'}`}>
                          Stock: {mat?.current_stock || 0} / Req: {isNaN(neededQty) ? '0.00' : neededQty.toFixed(2)} {ing.unit}
                          {!hasStock && ` (Faltan ${(neededQty - (parseFloat(mat?.current_stock) || 0)).toFixed(2)})`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-end mt-4">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">NOMBRE RESPONSABLE ALISTAMIENTO</label>
                  <input 
                    type="text" 
                    className="w-full p-2 text-sm border-2 border-gray-100 rounded-lg focus:border-primary-500 outline-none"
                    placeholder="Quien alista los materiales..."
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                  />
                </div>
                <button 
                  disabled={!responsable || localChecklist.length < (recipe.ingredients?.length || 0)}
                  onClick={() => advanceOrder(o.id || o._id, 'pesaje', { 
                    responsable_alistamiento: responsable,
                    checklist_alistamiento: (recipe.ingredients || []).map(ing => ({
                      material_id: ing.raw_material_id,
                      name: ing.raw_material_name,
                      checked: localChecklist.includes(ing.raw_material_id)
                    }))
                  })}
                  className="btn-primary w-full sm:w-auto h-[42px] px-6 font-bold uppercase tracking-widest text-xs"
                >
                  Pasar a Pesaje
                </button>
              </div>
            </div>
          )}

          {o.stage === 'pesaje' && (
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PESAJE (VERIFICACIÓN Y FIRMA)</p>
              <div className="bg-white p-4 rounded-xl border-2 border-primary-100 mb-4">
                <p className="text-sm font-semibold">Declaro que he verificado el peso exacto de las materias primas para esta orden y coinciden con la receta.</p>
                <div className="mt-4 flex gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg border border-gray-200 w-full hover:bg-gray-100 transition-colors">
                    <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" checked={localChecklist.includes('peso_ok')} onChange={(e) => e.target.checked ? setLocalChecklist(['peso_ok']) : setLocalChecklist([])} />
                    <span className="font-bold text-gray-700">TODO CONFORME Y PESADO</span>
                  </label>
                </div>
                <div className="mt-4">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">FIRMA / RESPONSABLE PESAJE</label>
                  <input type="text" className="w-full p-2 text-sm border-2 border-gray-100 rounded-lg" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nombre del responsable..." />
                </div>
              </div>
              <button 
                disabled={!responsable || !localChecklist.includes('peso_ok')}
                onClick={() => advanceOrder(o.id || o._id, 'pre_fabricacion', { 
                  form_pesaje_firma: { responsable, ok: true }
                })}
                className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-sm"
              >
                Pasar a Pre-Fabricación
              </button>
            </div>
          )}

          {o.stage === 'pre_fabricacion' && (
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PRE-FABRICACIÓN (CONTROLES)</p>
              <div className="space-y-3">
                {['Despeje de Área', 'Desinfección', 'Verificación de Agua', 'Higiene Personal'].map(item => (
                  <label key={item} className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-100 bg-white cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" checked={localChecklist.includes(item)} onChange={(e) => {
                      if (e.target.checked) setLocalChecklist([...localChecklist, item]);
                      else setLocalChecklist(localChecklist.filter(x => x !== item));
                    }} />
                    <span className="font-bold text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
              <button 
                disabled={localChecklist.length < 4}
                onClick={() => advanceOrder(o.id || o._id, 'mezclado_llenado', { 
                  form_despeje_fabricacion: { ok: localChecklist.includes('Despeje de Área') },
                  form_desinfeccion: { ok: localChecklist.includes('Desinfección') },
                  form_agua: { ok: localChecklist.includes('Verificación de Agua') },
                  form_higiene: { ok: localChecklist.includes('Higiene Personal') },
                })}
                className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-sm"
              >
                Pasar a Mezclado y Llenado
              </button>
            </div>
          )}

          {o.stage === 'mezclado_llenado' && (
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MEZCLADO Y LLENADO</p>
              <div className="bg-white p-4 rounded-xl border-2 border-primary-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">TIEMPO DE MEZCLADO (MIN)</label>
                    <input type="number" className="w-full p-2 text-sm border-2 border-gray-100 rounded-lg" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Ej: 45" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">PESO/VOLUMEN PROM (g/ml)</label>
                    <input type="number" className="w-full p-2 text-sm border-2 border-gray-100 rounded-lg" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Ej: 500" />
                  </div>
                </div>
              </div>
              <button 
                disabled={!observations || !responsable}
                onClick={() => advanceOrder(o.id || o._id, 'etiquetado', { 
                  form_tiempos_mezclado: { tiempo_minutos: observations },
                  form_peso_volumen: { promedio: responsable }
                })}
                className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-sm"
              >
                Pasar a Etiquetado
              </button>
            </div>
          )}

          {o.stage === 'etiquetado' && (
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ETIQUETADO Y BODEGA</p>
              <div className="bg-white p-4 rounded-xl border-2 border-primary-100">
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg border border-gray-200 w-full hover:bg-gray-100 transition-colors mb-4">
                  <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" checked={localChecklist.includes('etiquetas_ok')} onChange={(e) => e.target.checked ? setLocalChecklist(['etiquetas_ok']) : setLocalChecklist([])} />
                  <span className="font-bold text-gray-700">Lote, Fechas y Etiquetas Correctas</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">CANTIDAD FINAL PRODUCIDA (OK)</label>
                    <input type="number" className="w-full p-2 text-sm border-2 border-gray-100 rounded-lg" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Unidades finales..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">NOVEDADES / MERMAS</label>
                    <input type="text" className="w-full p-2 text-sm border-2 border-gray-100 rounded-lg" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Ej: 2 unidades con defectos" />
                  </div>
                </div>
              </div>
              <button 
                disabled={!responsable || !localChecklist.includes('etiquetas_ok')}
                onClick={() => advanceOrder(o.id || o._id, 'terminada', { 
                  actual_output: parseInt(responsable),
                  novedades: observations,
                  form_recepcion_bodega: { ingresado: true }
                })}
                className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-sm"
              >
                Enviar a Bodega (Terminar Orden)
              </button>
            </div>
          )}

          {o.stage === 'montada' && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen de Insumos</p>
                <span className="text-[10px] font-bold text-red-500">VERIFICAR ANTES DE ALISTAR</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(recipe.ingredients || []).map((ing, i) => {
                  const mat = (rawMaterials || []).find(m => m.id === ing.raw_material_id);
                  const orderQty = parseFloat(o.quantity) || 1;
                  const ingQty = parseFloat(ing.quantity) || 0;
                  const expQty = parseFloat(recipe?.expected_quantity) || 1;
                  const neededQty = (ingQty * orderQty) / expQty;
                  const hasStock = mat ? (parseFloat(mat.current_stock) || 0) >= neededQty : false;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border text-sm ${hasStock ? 'bg-white border-gray-100' : 'bg-red-50 border-red-200 text-red-900'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{ing.raw_material_name}</p>
                        <p className="text-[10px] text-gray-500">Stock: {mat?.current_stock || 0} / Req: {isNaN(neededQty) ? '0.00' : neededQty.toFixed(2)} {ing.unit}</p>
                      </div>
                      {!hasStock && <span className="text-[10px] font-bold text-red-500 flex-shrink-0">Faltan: {isNaN(neededQty) ? '0.00' : (neededQty - (parseFloat(mat?.current_stock) || 0)).toFixed(2)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {o.stage === 'terminada' && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm font-bold text-green-800 mb-2">ORDEN COMPLETADA</p>
                <div className="col-span-2">
                  <p className="text-[10px] text-green-600/60 uppercase">TIEMPO FINALIZACIÓN</p>
                  <p>{o.end_time ? new Date(o.end_time).toLocaleString('es-CO') : '—'}</p>
                </div>
              </div>

          )}
        </div>
      )}
    </div>
  );
};

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
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderProductType, setOrderProductType] = useState('H');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [expandedWarehouse, setExpandedWarehouse] = useState(null);
  const [materialForm, setMaterialForm] = useState({ name: '', sku: '', current_stock: '', min_stock: '', unit: 'kg', purchase_price: '', purchase_quantity: '', purchase_unit_measure: 'kg', cost_per_unit: '', supplier: '', lote: '', vencimiento: '', warehouse_id: '' });
  const [recipeForm, setRecipeForm] = useState({ cliente: '', description: '', output_product_id: '', output_product_name: '', expected_quantity: '', image_url: '', label_image_url: '', box_image_url: '', internal_coding: '', ingredients: [], packaging_materials: [] });
  const [newIngredient, setNewIngredient] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'kg' });
  const [newPackaging, setNewPackaging] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'unidades', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'unidades' });
  const [uploading, setUploading] = useState(false);
  const [advancingOrder, setAdvancingOrder] = useState(null);
  const [selectedRecipeFile, setSelectedRecipeFile] = useState(null);
  const [selectedLabelFile, setSelectedLabelFile] = useState(null);
  const [selectedBoxFile, setSelectedBoxFile] = useState(null);
  const [selectedMaterialFile, setSelectedMaterialFile] = useState(null);
  const [searchMaterials, setSearchMaterials] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [searchRecipes, setSearchRecipes] = useState('');
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ supplier: '', invoice_number: '', items: [] });
  const [currentInvoiceItem, setCurrentInvoiceItem] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit_measure: 'kg', unit_price: '' });
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const handleRecipeFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedRecipeFile(e.target.files[0]);
    }
  };
  const handleLabelFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedLabelFile(e.target.files[0]);
    }
  };
  const handleBoxFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedBoxFile(e.target.files[0]);
    }
  };

  const handleMaterialFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedMaterialFile(e.target.files[0]);
    }
  };

  const loadData = async () => {
    try {
      const [o, r, m, p, w, pi] = await Promise.all([
        api.get('production-orders').catch(() => ({ data: [] })), 
        api.get('recipes').catch(() => ({ data: [] })), 
        api.get('raw-materials').catch(() => ({ data: [] })), 
        api.get('products').catch(() => ({ data: [] })), 
        api.get('warehouses').catch(() => ({ data: [] })),
        api.get('purchase-invoices').catch(() => ({ data: [] }))
      ]);
      console.log('📦 Órdenes crudas desde BD:', o.data);
      setOrders(o.data || []); 
      setRecipes(r.data || []); 
      setRawMaterials(m.data || []); 
      setProducts(p.data || []); 
      setWarehouses(w.data || []);
      setPurchaseInvoices(pi.data || []);
    } catch (error) {
      console.error("Error loading production data:", error);
      toast.error("Error al cargar datos de producción. Verifique la conexión.");
    }
  };
  useEffect(() => { loadData(); }, []);

  const createOrder = async () => {
    const recipe = recipes.find((r) => r.id === selectedRecipe);
    if (!recipe) { toast.error('Selecciona una receta'); return; }
    const validQty = parseInt(orderQuantity) || 1;
    if (validQty <= 0) { toast.error('La cantidad a producir debe ser mayor a 0'); return; }
    try {
      await api.post('production-orders', { 
        recipe_id: recipe.id, 
        recipe_name: recipe.output_product_name, 
        quantity: validQty,
        product_type: orderProductType,
        warehouse_id: selectedWarehouse || null,
        start_time: new Date().toISOString()
      });
      setShowOrderForm(false); setSelectedRecipe(''); setOrderQuantity(1); setOrderProductType('H'); setSelectedWarehouse(''); loadData();
      toast.success('Orden de producción creada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear orden');
    }
  };

  const advanceOrder = async (orderId, nextStage, data = {}) => {
    try {
      await api.post(`production-orders/${orderId}/advance`, {
        next_stage: nextStage,
        ...data
      });
      loadData();
      toast.success(`Orden avanzada a: ${nextStage}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al avanzar la orden');
    }
  };

  const createRecipe = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let recipeId = editingRecipe?.id;
      const payload = { ...recipeForm, expected_quantity: parseInt(recipeForm.expected_quantity) };
      
      if (payload.output_product_id === 'NEW') {
        const productRes = await api.post('products', {
          sku: `GEN-${Math.floor(Math.random() * 10000)}`,
          name: payload.output_product_name,
          cost_buy: 0,
          cost_sell: 0,
          stock_current: 0,
          stock_min: 0,
          warehouse_id: null
        });
        payload.output_product_id = productRes.data.id;
      }

      if (editingRecipe) {
        await api.put(`recipes/${editingRecipe.id}`, payload);
        toast.success('Receta actualizada correctamente');
      } else {
        const res = await api.post('recipes', payload);
        recipeId = res.data.id;
        toast.success('Receta/Kit creado correctamente');
      }

      // Upload image if selected
      if (selectedRecipeFile && recipeId) {
        const formData = new FormData();
        formData.append('file', selectedRecipeFile);
        await api.post(`upload/recipe-image/${recipeId}?image_type=main`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      if (selectedLabelFile && recipeId) {
        const formData = new FormData();
        formData.append('file', selectedLabelFile);
        await api.post(`upload/recipe-image/${recipeId}?image_type=label`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      if (selectedBoxFile && recipeId) {
        const formData = new FormData();
        formData.append('file', selectedBoxFile);
        await api.post(`upload/recipe-image/${recipeId}?image_type=box`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowRecipeForm(false); 
      setEditingRecipe(null); 
      setSelectedRecipeFile(null);
      setSelectedLabelFile(null);
      setSelectedBoxFile(null);
      setRecipeForm({ cliente: '', description: '', output_product_id: '', output_product_name: '', expected_quantity: '', image_url: '', label_image_url: '', box_image_url: '', internal_coding: '', ingredients: [], packaging_materials: [] }); 
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar receta');
    } finally {
      setUploading(false);
    }
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
      label_image_url: recipe.label_image_url || '',
      box_image_url: recipe.box_image_url || '',
      internal_coding: recipe.internal_coding || '',
      ingredients: recipe.ingredients || [], packaging_materials: recipe.packaging_materials || []
    });
    setShowRecipeForm(true);
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm('¿Eliminar esta receta permanentemente?')) return;
    try {
      await api.delete(`recipes/${id}`);
      toast.success('Receta eliminada');
      loadData();
    } catch (e) {
      toast.error('Error al eliminar receta');
    }
  };

  const addIngredient = () => {
    if (!newIngredient.raw_material_id || !newIngredient.quantity) return;
    setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { ...newIngredient, quantity: parseFloat(newIngredient.quantity) || 0 }] });
    setNewIngredient({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'kg' });
  };

  const createMaterial = async (e) => {
    e.preventDefault();
    setUploading(true);
    const payload = { 
      ...materialForm, 
      current_stock: parseFloat(materialForm.current_stock) || 0, 
      min_stock: parseFloat(materialForm.min_stock) || 0, 
      purchase_price: parseFloat(materialForm.purchase_price) || 0,
      purchase_quantity: parseFloat(materialForm.purchase_quantity) || 1,
      cost_per_unit: parseFloat(materialForm.cost_per_unit) || 0,
      warehouse_id: materialForm.warehouse_id || null
    };

    try {
      let materialId = editingMaterial?.id;
      if (editingMaterial) {
        await api.put(`raw-materials/${editingMaterial.id}`, payload);
        toast.success('Materia prima actualizada');
      } else {
        const res = await api.post('raw-materials', payload);
        materialId = res.data.id;
        toast.success('Materia prima registrada');
      }

      // Upload image if selected
      if (selectedMaterialFile && materialId) {
        const formData = new FormData();
        formData.append('file', selectedMaterialFile);
        await api.post(`upload/material-image/${materialId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setShowMaterialForm(false); 
      setEditingMaterial(null);
      setSelectedMaterialFile(null);
      setMaterialForm({ name: '', sku: '', current_stock: '', min_stock: '', unit: 'kg', purchase_price: '', purchase_quantity: '', purchase_unit_measure: 'kg', cost_per_unit: '', supplier: '', lote: '', vencimiento: '', warehouse_id: '' }); 
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar materia prima');
    } finally {
      setUploading(false);
    }
  };

  const addInvoiceItem = () => {
    if (!currentInvoiceItem.raw_material_name && !currentInvoiceItem.raw_material_id) return toast.error('Debe seleccionar o escribir un producto');
    if (!currentInvoiceItem.quantity || !currentInvoiceItem.unit_price) return toast.error('Debe ingresar cantidad y precio');
    
    const matName = currentInvoiceItem.raw_material_id && !currentInvoiceItem.raw_material_name 
      ? (rawMaterials.find(m => m.id === currentInvoiceItem.raw_material_id)?.name || '') 
      : currentInvoiceItem.raw_material_name;

    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, {
        raw_material_id: currentInvoiceItem.raw_material_id || null,
        raw_material_name: matName,
        quantity: parseFloat(currentInvoiceItem.quantity) || 0,
        unit_measure: currentInvoiceItem.unit_measure,
        unit_price: parseFloat(currentInvoiceItem.unit_price) || 0
      }]
    });
    setCurrentInvoiceItem({ raw_material_id: '', raw_material_name: '', quantity: '', unit_measure: 'kg', unit_price: '' });
  };

  const removeInvoiceItem = (index) => {
    const newItems = [...invoiceForm.items];
    newItems.splice(index, 1);
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const createPurchaseInvoice = async () => {
    if (invoiceForm.items.length === 0) return toast.error('La factura debe tener al menos un ítem');
    try {
      await api.post('purchase-invoices', invoiceForm);
      toast.success('Factura registrada y stock actualizado');
      setShowInvoiceForm(false);
      setInvoiceForm({ supplier: '', invoice_number: '', items: [] });
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al registrar factura');
    }
  };

  const handleEditMaterial = (m) => {
    setEditingMaterial(m);
    setMaterialForm({
      name: m.name ?? '',
      sku: m.sku ?? '',
      current_stock: m.current_stock ?? 0,
      min_stock: m.min_stock ?? 0,
      unit: m.unit ?? 'kg',
      purchase_price: m.purchase_price ?? '',
      purchase_quantity: m.purchase_quantity ?? '',
      purchase_unit_measure: m.purchase_unit_measure ?? m.unit ?? 'kg',
      cost_per_unit: m.cost_per_unit ?? '',
      supplier: m.supplier ?? '',
      lote: m.lote ?? '',
      vencimiento: m.vencimiento ?? '',
      warehouse_id: m.warehouse_id ?? ''
    });
    setShowMaterialForm(true);
  };

  const stages = ['montada', 'alistamiento', 'pesaje', 'pre_fabricacion', 'mezclado_llenado', 'etiquetado', 'terminada'];
  const stageColors = { 
    montada: 'badge-blue', 
    alistamiento: 'badge-yellow', 
    pesaje: 'badge-purple', 
    pre_fabricacion: 'badge-orange', 
    mezclado_llenado: 'badge-red', 
    etiquetado: 'badge-indigo', 
    terminada: 'badge-green' 
  };
  const stageIdx = (stage) => stages.indexOf(stage);

  const getRecipeForOrder = (order) => (recipes || []).find(r => r?.id === order?.recipe_id);
  const getWarehouseName = (id) => (warehouses || []).find(w => w.id === id)?.name || '';
  const fmt = (n) => `$${Math.round(n || 0).toLocaleString('es-CO')}`;

  const getConversionFactor = (fromU, toU) => {
    const p = fromU?.toLowerCase() || '';
    const r = toU?.toLowerCase() || '';
    if (p === r) return 1;
    if (p === 'kg' && r === 'g') return 1000;
    if (p === 'g' && r === 'kg') return 0.001;
    if (p === 'l' && r === 'ml') return 1000;
    if (p === 'ml' && r === 'l') return 0.001;
    return 1;
  };

  // Calculate kit cost
  const calcKitCost = (recipe) => {
    if (!recipe?.ingredients) return 0;
    return recipe.ingredients.reduce((total, ing) => {
      // Use ingredient specific cost if available, otherwise fallback to material
      const mat = (rawMaterials || []).find(m => m.id === ing.raw_material_id);
      const fallbackCpu = mat?.cost_per_unit || 0;
      const cpu = ing.purchase_price ? (ing.purchase_price / (ing.purchase_quantity || 1)) : fallbackCpu;
      return total + (ing.quantity * cpu);
    }, 0);
  };

  // Group orders by stage
  const ordersByStage = (stages || []).reduce((acc, stage) => {
    acc[stage] = (orders || []).filter(o => o && o.stage === stage);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Producción</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">GESTIÓN COMPLETA DE PRODUCCIÓN</p>
        </div>
        {tab === 'orders' && <button onClick={() => setShowOrderForm(true)} className="btn-primary"><Plus size={16} /> Nueva Orden</button>}
        {tab === 'recipes' && <button onClick={() => setShowRecipeForm(true)} className="btn-primary"><Plus size={16} /> Nueva Receta</button>}
        {tab === 'materials' && (
          <div className="flex gap-2">
            <button onClick={() => setShowInvoiceForm(true)} className="btn-primary text-sm px-3"><Plus size={16} /> Nueva Factura</button>
            <button onClick={() => setShowMaterialForm(true)} className="btn-primary text-sm px-3"><Plus size={16} /> Nueva Materia Prima</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {(stages || []).map(stage => {
          const colorClass = stageColors[stage]?.replace('badge-', 'border-') || 'border-gray-200';
          return (
            <div key={stage} className={`glass-card p-3 border-t-4 ${colorClass}`}>
              <p className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">{stage.replace('_', ' ')}</p>
              <p className="text-xl font-black text-gray-900 mt-1">{ordersByStage[stage]?.length || 0}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('materials')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'materials' ? 'tab-active' : 'tab-inactive'}`}>Inventario</button>
        <button onClick={() => setTab('recipes')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'recipes' ? 'tab-active' : 'tab-inactive'}`}>Recetas/Kits</button>
        <button onClick={() => setTab('orders')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'orders' ? 'tab-active' : 'tab-inactive'}`}>Órdenes</button>
        <button onClick={() => setTab('warehouses')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'warehouses' ? 'tab-active' : 'tab-inactive'}`}>Bodegas</button>
      </div>

      {tab === 'orders' && (
        <div className="space-y-6">
          {/* Stage Segmented View */}
          {(stages || []).map(stage => (
            ordersByStage[stage]?.length > 0 && (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`badge ${stageColors[stage]}`}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
                  <span className="text-xs text-gray-400">{ordersByStage[stage].length} órdenes</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="space-y-2">
                  {(ordersByStage[stage] || []).map((o) => (
                    <OrderCard 
                      key={o?.id || Math.random()}
                      o={o}
                      stages={stages}
                      stageColors={stageColors}
                      stageIdx={stageIdx}
                      getRecipeForOrder={getRecipeForOrder}
                      recipes={recipes}
                      rawMaterials={rawMaterials}
                      advanceOrder={advanceOrder} setAdvancingOrder={setAdvancingOrder}
                      expandedOrder={expandedOrder}
                      setExpandedOrder={setExpandedOrder}
                      setPrintingOrder={setPrintingOrder}
                      warehouses={warehouses}
                      fmt={fmt}
                    />
                  ))}
                </div>
              </div>
            )
          ))}
          {orders.length === 0 && <div className="glass-card p-12 text-center"><p className="text-gray-400">No hay órdenes de producción</p></div>}
        </div>
      )}

      {tab === 'recipes' && (
        <div>
        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Buscar receta..." value={searchRecipes} onChange={e => setSearchRecipes(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(recipes || []).length === 0 ? <p className="text-gray-400 col-span-full text-center py-8 glass-card">No hay recetas</p> : (recipes || []).filter(r => { const q = searchRecipes.toLowerCase(); return !q || r.output_product_name?.toLowerCase().includes(q) || r.cliente?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q); }).map((r) => {
            if (!r) return null;
            const kitCost = calcKitCost(r);
            return (
              <div key={r.id} className="glass-card overflow-hidden border-t-4 border-blue-500 hover:shadow-lg transition-shadow">
                {r.image_url && typeof r.image_url === 'string' && (
                  <div className="h-40 w-full overflow-hidden bg-gray-100">
                    <img src={getAssetUrl(r.image_url)} alt={r.output_product_name} className="w-full h-full object-cover" />
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
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-sm bg-primary-50 px-2 py-1 rounded-full">
                          <DollarSign size={14} className="text-primary-500" />
                          <span className="font-bold text-primary-600">{fmt(kitCost / (r.expected_quantity || 1))} /u</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">Lote: {fmt(kitCost)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{r.description || 'Sin descripción'}</p>
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingredientes Principales</p>
                    {(r.ingredients || []).slice(0, 3).map((ing, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">• {ing?.raw_material_name}</span>
                        <span className="text-gray-500 font-medium">{ing?.quantity} {ing?.unit}</span>
                      </div>
                    ))}
                    {r.ingredients?.length > 3 && <p className="text-xs text-gray-400">+{r.ingredients.length - 3} más...</p>}
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-4">
                    <button className="flex-1 btn-secondary py-2 text-xs">Detalles</button>
                    <button onClick={() => handleEditRecipe(r)} className="btn-secondary py-2 px-4 text-xs">Editar</button>
                    <button onClick={() => deleteRecipe(r.id)} className="btn-secondary py-2 px-4 text-xs text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {tab === 'materials' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4"><div className="text-xs text-gray-500">Total Materias</div><div className="text-2xl font-bold">{rawMaterials.length}</div></div>
          <div className="card p-4"><div className="text-xs text-gray-500">Valor Inventario MP</div><div className="text-2xl font-bold">{fmt(rawMaterials.reduce((s, m) => s + (m.current_stock || 0) * (m.cost_per_unit || m.purchase_price || 0), 0))}</div></div>
          <div onClick={() => setShowLowStockOnly(!showLowStockOnly)} className={`card p-4 cursor-pointer transition-colors ${showLowStockOnly ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-gray-50'}`}><div className="text-xs text-gray-500">Stock Bajo</div><div className="text-2xl font-bold text-red-500">{rawMaterials.filter(m => m.current_stock < m.min_stock).length}</div></div>
          <div className="card p-4"><div className="text-xs text-gray-500">Costo Promedio/Unidad</div><div className="text-2xl font-bold">{fmt(rawMaterials.length ? rawMaterials.reduce((s, m) => s + (m.cost_per_unit || 0), 0) / rawMaterials.length : 0)}</div></div>
        </div>
      )}

      {tab === 'materials' && (
        <div className="mb-4 p-4 pb-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Buscar materia prima..." value={searchMaterials} onChange={e => setSearchMaterials(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-300"/>
          </div>
          <select 
            className="w-full sm:w-64 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300"
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
          >
            <option value="">Todas las bodegas</option>
            <option value="none">Sin asignar</option>
            {warehouses.map(w => <option key={w?.id} value={w?.id}>{w?.name}</option>)}
          </select>
        </div>
      )}

      {tab === 'materials' && (
        <div className="glass-card overflow-hidden">
          {(rawMaterials || []).length === 0 ? <p className="text-gray-400 text-center py-8">No hay materias primas</p> : (
            <div className="overflow-x-auto">
                {rawMaterials.filter(m => { 
                  const q = searchMaterials.toLowerCase(); 
                  const matchesSearch = !q || m.name?.toLowerCase().includes(q) || m.sku?.toLowerCase().includes(q) || getWarehouseName(m.warehouse_id)?.toLowerCase().includes(q); 
                  const matchesWarehouse = !filterWarehouse ? true : (filterWarehouse === 'none' ? !m.warehouse_id : m.warehouse_id === filterWarehouse);
                  return matchesSearch && matchesWarehouse;
                }).map((m) => (
                  <div key={m.id} className="data-row gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <Boxes size={22} className="text-primary-400 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-11 gap-2 py-3">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nombre</p>
                    <p className="font-bold text-sm text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.sku}</p>
                    <p className="text-[10px] text-blue-500 font-medium">
                      <Home size={10} className="inline mr-1" />
                      {m.warehouse_id ? ((warehouses || []).find(w => w.id === m.warehouse_id)?.name || 'Bodega desconocida') : 'Sin bodega'}
                    </p>
                  </div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stock</p><p className={`font-bold text-sm ${m.current_stock <= m.min_stock ? 'text-red-600' : 'text-green-600'}`}>{m.current_stock} {m.unit}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Precio Compra</p><p className="font-medium text-xs text-gray-700">{fmt(m.purchase_price)}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cant. Comprada</p><p className="font-medium text-xs text-gray-700">{m.purchase_quantity || '—'} {m.purchase_unit_measure || m.unit}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Costo/U</p><p className="font-bold text-sm text-primary-600">{fmt(m.cost_per_unit)}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lote</p><p className="font-medium text-xs text-gray-700">{m.lote || '—'}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vence</p><p className="font-medium text-xs text-gray-700">{m.vencimiento || '—'}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Costo Total</p><p className="font-bold text-sm text-gray-800">{fmt((m.cost_per_unit || m.purchase_price || 0) * (m.current_stock || 0))}</p></div>
                  <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Proveedor</p><p className="font-medium text-xs text-gray-600 truncate">{m.supplier || '—'}</p></div>
                  <div className="flex items-center justify-end gap-2 col-span-2 sm:col-span-1 md:col-span-1">
                    {m.image_url && <img src={m.image_url.startsWith('http') ? m.image_url : `https://checkadmin-api.onrender.com${m.image_url}`} alt={m.name} className="w-8 h-8 rounded object-cover border border-gray-200" />}
                    <button onClick={() => handleEditMaterial(m)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600 transition-colors">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(warehouses || []).map((w) => {
              const isExpanded = expandedWarehouse === w.id;
              const materialsInWarehouse = (rawMaterials || []).filter(m => m.warehouse_id === w.id);
              
              return (
                <div key={w.id} className="glass-card overflow-hidden transition-all duration-300">
                  <div 
                    onClick={() => setExpandedWarehouse(isExpanded ? null : w.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Boxes size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{w.name}</h3>
                        <p className="text-xs text-gray-500">{materialsInWarehouse.length} materias primas</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      {materialsInWarehouse.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Bodega vacía</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {materialsInWarehouse.map(m => (
                            <div key={m.id} className="bg-white p-2 rounded border border-gray-200 flex justify-between items-center text-sm">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{m.name}</p>
                                <p className="text-xs text-gray-500">{m.sku} • Stock: <span className="font-bold">{m.current_stock}</span> {m.unit}</p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingMaterial(m); setShowMaterialForm(true); }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded flex items-center gap-1 transition-colors"
                              >
                                <Edit2 size={14} /> <span className="text-xs font-medium">Editar</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {warehouses.length === 0 && <p className="text-center text-gray-500 py-8">No hay bodegas registradas</p>}
        </div>
      )}

      {tab === 'materials' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Facturas de Compra</h3>
          </div>
          <div className="glass-card overflow-hidden">
            {(purchaseInvoices || []).length === 0 ? <p className="text-gray-400 text-center py-8">No hay facturas de compra</p> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Ítems</th>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-left"># Factura</th>
                    <th className="px-4 py-3 text-left">Total Factura</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {(purchaseInvoices || []).map((inv, i) => (
                    <React.Fragment key={inv.id || i}>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 group cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === inv.id ? null : inv.id)}>
                        <td className="px-4 py-3 font-medium">{inv.items?.length || 1} ítems</td>
                        <td className="px-4 py-3">{inv.supplier || '—'}</td>
                        <td className="px-4 py-3 font-medium">{inv.invoice_number || '—'}</td>
                        <td className="px-4 py-3 font-bold text-primary-600">{fmt(inv.total_amount || inv.total || 0)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('es-CO') : '—'}</td>
                        <td className="px-4 py-3 text-right"><ChevronRight size={16} className={`inline transition-transform ${expandedOrder === inv.id ? 'rotate-90' : ''}`} /></td>
                      </tr>
                      {expandedOrder === inv.id && (
                        <tr>
                          <td colSpan="6" className="p-0 border-b border-gray-100">
                            <div className="bg-gray-50 p-4 shadow-inner">
                              <table className="w-full text-xs">
                                <thead className="text-gray-500 uppercase">
                                  <tr><th className="text-left py-2">Producto</th><th className="text-left py-2">Cantidad</th><th className="text-left py-2">V. Unitario</th><th className="text-left py-2">Subtotal</th></tr>
                                </thead>
                                <tbody>
                                  {(inv.items || (inv.raw_material_id ? [{ raw_material_name: inv.raw_material_name || inv.raw_material_id, quantity: inv.quantity, unit_measure: inv.unit_measure, unit_price: inv.unit_price, total: inv.total }] : [])).map((item, j) => (
                                    <tr key={j} className="border-t border-gray-200">
                                      <td className="py-2 font-medium">{item.raw_material_name}</td>
                                      <td className="py-2">{item.quantity} {item.unit_measure || ''}</td>
                                      <td className="py-2">{fmt(item.unit_price)}</td>
                                      <td className="py-2 font-bold">{fmt(item.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showInvoiceForm && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Nueva Factura de Compra</h3><button onClick={() => setShowInvoiceForm(false)}><X size={20} /></button></div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Proveedor</label>
                  <input type="text" className="w-full p-2 border border-gray-200 rounded-lg" value={invoiceForm.supplier} onChange={(e) => setInvoiceForm({ ...invoiceForm, supplier: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1"># Factura</label>
                  <input type="text" className="w-full p-2 border border-gray-200 rounded-lg" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="font-bold text-sm text-gray-700">Agregar Producto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar o Seleccionar</label>
                    <select className="w-full p-2 text-sm border border-gray-200 rounded-lg" value={currentInvoiceItem.raw_material_id || (currentInvoiceItem.raw_material_name ? 'NEW' : '')} onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setCurrentInvoiceItem({ ...currentInvoiceItem, raw_material_id: '', raw_material_name: '' });
                      } else if (e.target.value === '') {
                        setCurrentInvoiceItem({ ...currentInvoiceItem, raw_material_id: '', raw_material_name: '' });
                      } else {
                        const mat = rawMaterials.find(m => m.id === e.target.value);
                        setCurrentInvoiceItem({ ...currentInvoiceItem, raw_material_id: mat.id, raw_material_name: mat.name, unit_measure: mat.unit || 'kg' });
                      }
                    }}>
                      <option value="">Seleccionar del inventario...</option>
                      {(rawMaterials || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      <option value="NEW">+ Agregar producto nuevo no registrado</option>
                    </select>
                  </div>
                  {(!currentInvoiceItem.raw_material_id && currentInvoiceItem.raw_material_name !== undefined) && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del Nuevo Producto</label>
                      <input type="text" className="w-full p-2 text-sm border border-gray-200 rounded-lg" placeholder="Ej: Pintura Azul..." value={currentInvoiceItem.raw_material_name} onChange={(e) => setCurrentInvoiceItem({ ...currentInvoiceItem, raw_material_name: e.target.value })} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Cantidad</label>
                    <div className="flex gap-2">
                      <input type="number" className="w-full p-2 text-sm border border-gray-200 rounded-lg" value={currentInvoiceItem.quantity} onChange={(e) => setCurrentInvoiceItem({ ...currentInvoiceItem, quantity: e.target.value })} />
                      <select className="w-20 p-2 text-sm border border-gray-200 rounded-lg" value={currentInvoiceItem.unit_measure} onChange={(e) => setCurrentInvoiceItem({ ...currentInvoiceItem, unit_measure: e.target.value })}>
                        <option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="und">und</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Precio Unitario</label>
                    <input type="number" step="0.01" className="w-full p-2 text-sm border border-gray-200 rounded-lg" value={currentInvoiceItem.unit_price} onChange={(e) => setCurrentInvoiceItem({ ...currentInvoiceItem, unit_price: e.target.value })} />
                  </div>
                </div>
                <button onClick={addInvoiceItem} className="w-full btn-secondary text-sm py-2"><Plus size={16} className="inline mr-1"/> Agregar a Factura</button>
              </div>

              {invoiceForm.items.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                      <tr><th className="px-3 py-2 text-left">Producto</th><th className="px-3 py-2 text-left">Cant.</th><th className="px-3 py-2 text-left">V. Unit</th><th className="px-3 py-2 text-left">Subtotal</th><th></th></tr>
                    </thead>
                    <tbody>
                      {invoiceForm.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium">
                            {item.raw_material_name}
                            {!item.raw_material_id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">NUEVO</span>}
                          </td>
                          <td className="px-3 py-2">{item.quantity} {item.unit_measure}</td>
                          <td className="px-3 py-2">{fmt(item.unit_price)}</td>
                          <td className="px-3 py-2 font-bold">{fmt(item.quantity * item.unit_price)}</td>
                          <td className="px-3 py-2 text-right"><button onClick={() => removeInvoiceItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                      <tr>
                        <td colSpan="3" className="px-3 py-3 text-right">TOTAL FACTURA:</td>
                        <td colSpan="2" className="px-3 py-3 text-primary-600 text-lg">{fmt(invoiceForm.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowInvoiceForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={createPurchaseInvoice} className="flex-1 btn-primary justify-center py-2.5 font-bold uppercase tracking-wider" disabled={invoiceForm.items.length === 0}>Guardar Factura</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* New Order Modal */}
      {showOrderForm && createPortal(
        <div className="modal-overlay">
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
                  {(recipes || []).map((r) => <option key={r?.id} value={r?.id}>{r?.output_product_name} ({r?.cliente || 'Genérico'})</option>)}
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
                    {(warehouses || []).map(w => <option key={w?.id} value={w?.id}>{w?.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Producto</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="product_type" value="H" checked={orderProductType === 'H'} onChange={(e) => setOrderProductType(e.target.value)} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium">Homeopatía (H)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="product_type" value="A" checked={orderProductType === 'A'} onChange={(e) => setOrderProductType(e.target.value)} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium">Alimento (A)</span>
                  </label>
                </div>
              </div>
              {selectedRecipe && (() => {
                const recipe = (recipes || []).find(r => r?.id === selectedRecipe);
                return (recipe?.ingredients || []).length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Resumen de Materiales ({orderQuantity} cant.)</p>
                    <div className="space-y-1">
                      {(recipe.ingredients || []).map((ing, i) => (
                        <div key={i} className="flex justify-between text-xs text-blue-800">
                          <span>{ing?.raw_material_name}</span>
                          <span className="font-bold">{(ing?.quantity * orderQuantity / (recipe?.expected_quantity || 1)).toFixed(2)} {ing?.unit}</span>
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
      , document.body)}

      {/* New Recipe Modal */}
      {showRecipeForm && createPortal(
        <div className="modal-overlay">
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
                      if (e.target.value === 'NEW') {
                        setRecipeForm({ ...recipeForm, output_product_id: 'NEW', output_product_name: '' });
                      } else {
                        const p = (products || []).find((x) => x?.id === e.target.value); 
                        setRecipeForm({ ...recipeForm, output_product_id: e.target.value, output_product_name: p?.name || '' }); 
                      }
                    }} 
                    required={recipeForm.output_product_id !== 'NEW'}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Seleccionar producto...</option>
                    <option value="NEW" className="font-bold text-primary-600">+ Añadir Producto Nuevo Manualmente</option>
                    {(products || []).map((p) => <option key={p?.id} value={p?.id}>{p?.name}</option>)}
                  </select>
                  {recipeForm.output_product_id === 'NEW' && (
                    <div className="mt-3 p-3 bg-primary-50 border border-primary-100 rounded-lg animate-fade-in">
                      <label className="block text-xs font-semibold text-primary-700 mb-1">Nombre del nuevo producto a crear:</label>
                      <input 
                        type="text" 
                        value={recipeForm.output_product_name} 
                        onChange={(e) => setRecipeForm({ ...recipeForm, output_product_name: e.target.value })} 
                        required 
                        className="w-full p-2 text-sm border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="Ej: Goma Secreta Lote B"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Se creará automáticamente en el inventario base.</p>
                    </div>
                  )}
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
                <div className="col-span-1">
                  <label className="block text-sm font-semibold mb-1">Imagen del Producto / Receta</label>
                  <div className="flex items-center gap-3 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <input type="file" accept="image/*" onChange={handleRecipeFileChange} className="hidden" id="recipe-image-upload" />
                    <label htmlFor="recipe-image-upload" className="btn-secondary text-xs cursor-pointer py-1.5 px-3">
                      {selectedRecipeFile ? 'Cambiar' : 'Subir'}
                    </label>
                    <span className="text-xs text-gray-400 flex-1 truncate">{selectedRecipeFile ? selectedRecipeFile.name : (recipeForm.image_url ? 'Cargada' : 'No hay archivo')}</span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold mb-1">Foto de Etiqueta</label>
                  <div className="flex items-center gap-3 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <input type="file" accept="image/*" onChange={handleLabelFileChange} className="hidden" id="label-image-upload" />
                    <label htmlFor="label-image-upload" className="btn-secondary text-xs cursor-pointer py-1.5 px-3">
                      {selectedLabelFile ? 'Cambiar' : 'Subir'}
                    </label>
                    <span className="text-xs text-gray-400 flex-1 truncate">{selectedLabelFile ? selectedLabelFile.name : (recipeForm.label_image_url ? 'Cargada' : 'No hay archivo')}</span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold mb-1">Foto de Caja</label>
                  <div className="flex items-center gap-3 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <input type="file" accept="image/*" onChange={handleBoxFileChange} className="hidden" id="box-image-upload" />
                    <label htmlFor="box-image-upload" className="btn-secondary text-xs cursor-pointer py-1.5 px-3">
                      {selectedBoxFile ? 'Cambiar' : 'Subir'}
                    </label>
                    <span className="text-xs text-gray-400 flex-1 truncate">{selectedBoxFile ? selectedBoxFile.name : (recipeForm.box_image_url ? 'Cargada' : 'No hay archivo')}</span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold mb-1">Código Interno</label>
                  <input 
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    value={recipeForm.internal_coding} 
                    onChange={(e) => setRecipeForm({ ...recipeForm, internal_coding: e.target.value })} 
                    placeholder="Ej: COD-INT-001" 
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
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {(recipeForm.ingredients || []).map((ing, i) => {
                    const cpu = (ing.purchase_price || 0) / (ing.purchase_quantity || 1);
                    return (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-bold text-gray-800">{ing.raw_material_name}</p>
                          <button 
                            type="button" 
                            onClick={() => {
                              const newIngs = [...recipeForm.ingredients];
                              newIngs.splice(i, 1);
                              setRecipeForm({ ...recipeForm, ingredients: newIngs });
                            }}
                            className="p-1 text-red-400 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Precio Compra</label>
                            <input 
                              type="number" 
                              className="w-full p-1.5 text-xs border rounded bg-white"
                              value={ing.purchase_price}
                              onChange={(e) => {
                                const newIngs = [...recipeForm.ingredients];
                                newIngs[i].purchase_price = parseFloat(e.target.value) || 0;
                                setRecipeForm({ ...recipeForm, ingredients: newIngs });
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Cant. Compra</label>
                            <div className="flex">
                              <input 
                                type="number" 
                                className="w-full p-1.5 text-xs border rounded-l bg-white"
                                value={ing.purchase_quantity}
                                onChange={(e) => {
                                  const newIngs = [...recipeForm.ingredients];
                                  newIngs[i].purchase_quantity = parseFloat(e.target.value) || 1;
                                  setRecipeForm({ ...recipeForm, ingredients: newIngs });
                                }}
                              />
                              <span className="bg-gray-200 border border-l-0 text-[10px] px-2 flex items-center rounded-r text-gray-600">{ing.purchase_unit || 'u'}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Cant. Receta</label>
                            <div className="flex">
                              <input 
                                type="number" 
                                className="w-full p-1.5 text-xs border rounded-l bg-white"
                                value={ing.quantity}
                                onChange={(e) => {
                                  const newIngs = [...recipeForm.ingredients];
                                  newIngs[i].quantity = parseFloat(e.target.value) || 0;
                                  setRecipeForm({ ...recipeForm, ingredients: newIngs });
                                }}
                              />
                              <span className="bg-gray-200 border border-l-0 text-[10px] px-2 flex items-center rounded-r text-gray-600">{ing.unit}</span>
                            </div>
                          </div>
                          <div className="bg-primary-50 rounded border border-primary-100 p-1.5 flex flex-col justify-center">
                            <label className="block text-[9px] font-bold text-primary-600 uppercase">Costo en Receta</label>
                            <p className="font-bold text-sm text-primary-700">
                              {(() => {
                                const mat = (rawMaterials || []).find(m => m.id === ing.raw_material_id);
                                const fallbackCpu = mat?.cost_per_unit || 0;
                                const baseCpu = ing.purchase_price ? (ing.purchase_price / (ing.purchase_quantity || 1)) : fallbackCpu;
                                const factor = getConversionFactor(ing.purchase_unit || mat?.unit, ing.unit);
                                const cpu = baseCpu / factor;
                                return fmt(ing.quantity * cpu);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4 p-3 bg-white border border-gray-200 rounded-lg items-center">
                  <select 
                    value={newIngredient.raw_material_id} 
                    onChange={(e) => { 
                      const m = (rawMaterials || []).find((x) => x?.id === e.target.value); 
                      setNewIngredient({ 
                        ...newIngredient, 
                        raw_material_id: e.target.value, 
                        raw_material_name: m?.name || '', 
                        unit: m?.unit || 'kg',
                        purchase_price: m?.purchase_price || m?.cost_per_unit || 0,
                        purchase_quantity: m?.purchase_quantity || 1,
                        purchase_unit: m?.purchase_unit_measure || m?.unit || 'kg'
                      }); 
                    }} 
                    className="flex-1 text-sm p-2 border rounded min-w-[150px]"
                  >
                    <option value="">Añadir material...</option>
                    {(rawMaterials || []).map((m) => <option key={m?.id} value={m?.id}>{m?.name}</option>)}
                  </select>
                  
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Cant." value={newIngredient.quantity} onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })} className="w-20 text-sm p-2 border rounded" />
                    <select value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })} className="text-sm p-2 border rounded bg-gray-50">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="und">und</option>
                    </select>
                  </div>
                  
                  {newIngredient.raw_material_id && (
                    <div className="px-3 py-1 bg-gray-50 rounded border border-gray-100 text-right min-w-[100px]">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase leading-none">Subtotal</span>
                      <span className="text-sm font-bold text-primary-600">
                        {(() => {
                          const baseCpu = newIngredient.purchase_price ? (newIngredient.purchase_price / (newIngredient.purchase_quantity || 1)) : 0;
                          const factor = getConversionFactor(newIngredient.purchase_unit, newIngredient.unit);
                          const cpu = baseCpu / factor;
                          return fmt((parseFloat(newIngredient.quantity) || 0) * cpu);
                        })()}
                      </span>
                    </div>
                  )}

                  <button type="button" onClick={addIngredient} className="btn-primary p-2 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Añadir</button>
                </div>
              </div>

                {/* EMPAQUE */}
                <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">Materiales de Empaque ({recipeForm.packaging_materials.length})</p>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {(recipeForm.packaging_materials || []).map((ing, i) => {
                    const cpu = (ing.purchase_price || 0) / (ing.purchase_quantity || 1);
                    return (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-bold text-gray-800">{ing.raw_material_name}</p>
                          <button 
                            type="button" 
                            onClick={() => {
                              const newIngs = [...recipeForm.packaging_materials];
                              newIngs.splice(i, 1);
                              setRecipeForm({ ...recipeForm, packaging_materials: newIngs });
                            }}
                            className="p-1 text-red-400 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Precio Compra</label>
                            <input 
                              type="number" 
                              className="w-full p-1.5 text-xs border rounded bg-white"
                              value={ing.purchase_price}
                              onChange={(e) => {
                                const newIngs = [...recipeForm.packaging_materials];
                                newIngs[i].purchase_price = parseFloat(e.target.value) || 0;
                                setRecipeForm({ ...recipeForm, packaging_materials: newIngs });
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Cant. Compra</label>
                            <div className="flex">
                              <input 
                                type="number" 
                                className="w-full p-1.5 text-xs border rounded-l bg-white"
                                value={ing.purchase_quantity}
                                onChange={(e) => {
                                  const newIngs = [...recipeForm.packaging_materials];
                                  newIngs[i].purchase_quantity = parseFloat(e.target.value) || 1;
                                  setRecipeForm({ ...recipeForm, packaging_materials: newIngs });
                                }}
                              />
                              <span className="bg-gray-200 border border-l-0 text-[10px] px-2 flex items-center rounded-r text-gray-600">{ing.purchase_unit || 'u'}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Cant. Receta</label>
                            <div className="flex">
                              <input 
                                type="number" 
                                className="w-full p-1.5 text-xs border rounded-l bg-white"
                                value={ing.quantity}
                                onChange={(e) => {
                                  const newIngs = [...recipeForm.packaging_materials];
                                  newIngs[i].quantity = parseFloat(e.target.value) || 0;
                                  setRecipeForm({ ...recipeForm, packaging_materials: newIngs });
                                }}
                              />
                              <span className="bg-gray-200 border border-l-0 text-[10px] px-2 flex items-center rounded-r text-gray-600">{ing.unit}</span>
                            </div>
                          </div>
                          <div className="bg-primary-50 rounded border border-primary-100 p-1.5 flex flex-col justify-center">
                            <label className="block text-[9px] font-bold text-primary-600 uppercase">Costo en Receta</label>
                            <p className="font-bold text-sm text-primary-700">
                              {(() => {
                                const mat = (rawMaterials || []).find(m => m.id === ing.raw_material_id);
                                const fallbackCpu = mat?.cost_per_unit || 0;
                                const baseCpu = ing.purchase_price ? (ing.purchase_price / (ing.purchase_quantity || 1)) : fallbackCpu;
                                const factor = getConversionFactor(ing.purchase_unit || mat?.unit, ing.unit);
                                const cpu = baseCpu / factor;
                                return fmt(ing.quantity * cpu);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4 p-3 bg-white border border-gray-200 rounded-lg items-center">
                  <select 
                    value={newPackaging.raw_material_id} 
                    onChange={(e) => { 
                      const m = (rawMaterials || []).find((x) => x?.id === e.target.value); 
                      setNewIngredient({ 
                        ...newPackaging, 
                        raw_material_id: e.target.value, 
                        raw_material_name: m?.name || '', 
                        unit: m?.unit || 'kg',
                        purchase_price: m?.purchase_price || m?.cost_per_unit || 0,
                        purchase_quantity: m?.purchase_quantity || 1,
                        purchase_unit: m?.purchase_unit_measure || m?.unit || 'kg'
                      }); 
                    }} 
                    className="flex-1 text-sm p-2 border rounded min-w-[150px]"
                  >
                    <option value="">Añadir empaque...</option>
                    {(rawMaterials || []).map((m) => <option key={m?.id} value={m?.id}>{m?.name}</option>)}
                  </select>
                  
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Cant." value={newPackaging.quantity} onChange={(e) => setNewIngredient({ ...newPackaging, quantity: e.target.value })} className="w-20 text-sm p-2 border rounded" />
                    <select value={newPackaging.unit} onChange={(e) => setNewIngredient({ ...newPackaging, unit: e.target.value })} className="text-sm p-2 border rounded bg-gray-50">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="und">und</option>
                    </select>
                  </div>
                  
                  {newPackaging.raw_material_id && (
                    <div className="px-3 py-1 bg-gray-50 rounded border border-gray-100 text-right min-w-[100px]">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase leading-none">Subtotal</span>
                      <span className="text-sm font-bold text-primary-600">
                        {(() => {
                          const baseCpu = newPackaging.purchase_price ? (newPackaging.purchase_price / (newPackaging.purchase_quantity || 1)) : 0;
                          const factor = getConversionFactor(newPackaging.purchase_unit, newPackaging.unit);
                          const cpu = baseCpu / factor;
                          return fmt((parseFloat(newPackaging.quantity) || 0) * cpu);
                        })()}
                      </span>
                    </div>
                  )}

                  <button type="button" onClick={handleAddPackaging} className="btn-primary p-2 whitespace-nowrap"><Plus size={16} className="inline mr-1"/> Añadir</button>
                </div>

                {recipeForm.ingredients.length > 0 && (() => {
                  const totalQty = recipeForm.ingredients.reduce((acc, ing) => acc + (parseFloat(ing.quantity) || 0), 0);
                  const expectedQty = parseFloat(recipeForm.expected_quantity) || 1;
                  const totalCost = recipeForm.ingredients.reduce((acc, ing) => {
                    const mat = (rawMaterials || []).find(m => m.id === ing.raw_material_id);
                    const fallbackCpu = mat?.cost_per_unit || 0;
                    const baseCpu = ing.purchase_price ? (ing.purchase_price / (ing.purchase_quantity || 1)) : fallbackCpu;
                    const factor = getConversionFactor(ing.purchase_unit || mat?.unit, ing.unit);
                    const cpu = baseCpu / factor;
                    return acc + (ing.quantity * cpu);
                  }, 0);
                  
                  return (
                    <div className="mt-4 p-3 bg-primary-50 rounded-xl border border-primary-100 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-primary-700">
                        <span>TOTAL INSUMOS:</span>
                        <span>{totalQty.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-primary-700">
                        <span>PESO POR UNIDAD:</span>
                        <span>{(totalQty / expectedQty).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-primary-800 pt-2 border-t border-primary-200 mt-2">
                        <span>COSTO TOTAL LOTE ({expectedQty} u):</span>
                        <span>{fmt(totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-black text-green-700 bg-green-100 p-2 rounded-lg border border-green-300">
                        <span>COSTO POR UNIDAD:</span>
                        <span>{fmt(totalCost / expectedQty)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3 font-bold uppercase tracking-widest mt-2">
                {editingRecipe ? 'Actualizar Receta' : 'Crear Receta'}
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      {/* New Material Modal */}
      {showMaterialForm && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">{editingMaterial ? 'Editar Materia Prima' : 'Nueva Materia Prima'}</h3><button onClick={() => { setShowMaterialForm(false); setEditingMaterial(null); }}><X size={20} /></button></div>
            <form onSubmit={createMaterial} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">SKU</label><input value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Stock Actual</label><input type="number" value={materialForm.current_stock} onChange={(e) => setMaterialForm({ ...materialForm, current_stock: e.target.value })} /></div>
                <div><label className="block text-sm font-semibold mb-1">Stock Mín.</label><input type="number" value={materialForm.min_stock} onChange={(e) => setMaterialForm({ ...materialForm, min_stock: e.target.value })} /></div>
                <div><label className="block text-sm font-semibold mb-1">Unidad</label>
                  <select value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}>{['kg','g','L','ml','unidades'].map((u) => <option key={u}>{u}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pb-2">
                <div><label className="block text-sm font-semibold mb-1">Precio Compra ($)</label><input type="number" step="0.01" value={materialForm.purchase_price} onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const qty = parseFloat(materialForm.purchase_quantity) || 1;
                  setMaterialForm({ ...materialForm, purchase_price: e.target.value, cost_per_unit: (val / qty).toFixed(2) });
                }} /></div>
                <div><label className="block text-sm font-semibold mb-1">Cant. Compra</label><input type="number" step="0.01" value={materialForm.purchase_quantity} onChange={(e) => {
                  const qty = parseFloat(e.target.value) || 1;
                  const val = parseFloat(materialForm.purchase_price) || 0;
                  setMaterialForm({ ...materialForm, purchase_quantity: e.target.value, cost_per_unit: (val / qty).toFixed(2) });
                }} /></div>
                <div><label className="block text-sm font-semibold mb-1">Unidad Compra</label>
                  <select value={materialForm.purchase_unit_measure} onChange={(e) => setMaterialForm({ ...materialForm, purchase_unit_measure: e.target.value })}>{['kg','g','L','ml','unidades'].map((u) => <option key={u}>{u}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Costo/U (Automático)</label><input type="number" step="0.01" value={materialForm.cost_per_unit} onChange={(e) => setMaterialForm({ ...materialForm, cost_per_unit: e.target.value })} readOnly className="bg-gray-100 cursor-not-allowed text-gray-600 font-bold" /></div>
                <div><label className="block text-sm font-semibold mb-1">Proveedor</label><input value={materialForm.supplier} onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-2">
                <div><label className="block text-sm font-semibold mb-1">Lote</label><input value={materialForm.lote} onChange={(e) => setMaterialForm({ ...materialForm, lote: e.target.value })} placeholder="Ej: L-2024-001" /></div>
                <div><label className="block text-sm font-semibold mb-1">Vencimiento</label><input type="date" value={materialForm.vencimiento} onChange={(e) => setMaterialForm({ ...materialForm, vencimiento: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Bodega</label>
                <select 
                  value={materialForm.warehouse_id} 
                  onChange={(e) => setMaterialForm({ ...materialForm, warehouse_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Seleccionar bodega...</option>
                  {(warehouses || []).map(w => <option key={w?.id} value={w?.id}>{w?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Imagen de Materia Prima</label>
                <div className="flex items-center gap-3 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <input type="file" accept="image/*" onChange={handleMaterialFileChange} className="hidden" id="material-image-upload" />
                  <label htmlFor="material-image-upload" className="btn-secondary text-xs cursor-pointer py-1.5 px-3">
                    {selectedMaterialFile ? 'Cambiar Imagen' : 'Seleccionar Archivo'}
                  </label>
                  {selectedMaterialFile ? (
                    <span className="text-xs text-gray-600 truncate flex-1">{selectedMaterialFile.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400 flex-1">{editingMaterial?.image_url ? 'Imagen actual conservada' : 'Opcional'}</span>
                  )}
                  {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">
                {editingMaterial ? 'Actualizar Materia Prima' : 'Registrar Materia Prima'}
              </button>
            </form>
          </div>
        </div>
      , document.body)}
    
      {advancingOrder && (
        <AdvanceStageModal 
          order={advancingOrder.order}
          currentStage={advancingOrder.order.stage}
          nextStage={advancingOrder.nextStage}
          onClose={() => setAdvancingOrder(null)}
          onAdvance={(orderId, nextStage, data) => {
            setAdvancingOrder(null);
            advanceOrder(orderId, nextStage, data);
          }}
        />
      )}

      {printingOrder && (
        <OrderPrintView 
          order={printingOrder}
          recipe={getRecipeForOrder(printingOrder)}
          rawMaterials={rawMaterials}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
    </>
  );
}
