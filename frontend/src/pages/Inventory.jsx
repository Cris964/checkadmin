import { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, MapPin, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';

export default function Inventory() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [expandedWarehouse, setExpandedWarehouse] = useState(null);
  const [warehouseProducts, setWarehouseProducts] = useState({});
  const [form, setForm] = useState({ sku: '', name: '', cost_buy: '', cost_sell: '', stock_min: '', stock_current: '', expiry_date: '', warehouse_id: '' });
  const [whForm, setWhForm] = useState({ name: '', location: '', description: '' });

  const loadData = async () => {
    const [p, w] = await Promise.all([api.get('/products'), api.get('/warehouses')]);
    setProducts(p.data);
    setWarehouses(w.data);
  };

  useEffect(() => { loadData(); }, []);

  const loadWarehouseProducts = async (warehouseId) => {
    if (expandedWarehouse === warehouseId) {
      setExpandedWarehouse(null);
      return;
    }
    try {
      const res = await api.get(`/warehouses/${warehouseId}/products`);
      setWarehouseProducts(prev => ({ ...prev, [warehouseId]: res.data }));
      setExpandedWarehouse(warehouseId);
    } catch (e) { console.error(e); }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      cost_buy: parseFloat(form.cost_buy),
      cost_sell: parseFloat(form.cost_sell),
      stock_min: parseInt(form.stock_min),
      stock_current: parseInt(form.stock_current),
      warehouse_id: form.warehouse_id || null
    };
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
      } else {
        await api.post('/products', data);
      }
      setShowForm(false);
      setEditingProduct(null);
      setForm({ sku: '', name: '', cost_buy: '', cost_sell: '', stock_min: '', stock_current: '', expiry_date: '', warehouse_id: '' });
      loadData();
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
    } catch (e) { toast.error(e.response?.data?.detail || 'Error al guardar producto'); }
  };

  const editProduct = (p) => {
    setEditingProduct(p);
    setForm({ sku: p.sku, name: p.name, cost_buy: p.cost_buy, cost_sell: p.cost_sell, stock_min: p.stock_min, stock_current: p.stock_current, expiry_date: p.expiry_date || '', warehouse_id: p.warehouse_id || '' });
    setShowForm(true);
  };

  const deleteProduct = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    await api.delete(`/products/${id}`);
    loadData();
    toast.success('Producto eliminado');
  };

  const createWarehouse = async (e) => {
    e.preventDefault();
    await api.post('/warehouses', whForm);
    setShowWarehouseForm(false);
    setWhForm({ name: '', location: '', description: '' });
    loadData();
    toast.success('Bodega creada');
  };

  const deleteWarehouse = async (id) => {
    if (!confirm('¿Eliminar bodega?')) return;
    await api.delete(`/warehouses/${id}`);
    loadData();
    toast.success('Bodega eliminada');
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`;
  const getWarehouseName = (id) => warehouses.find(w => w.id === id)?.name || '—';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Inventario</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">GESTIÓN DE PRODUCTOS Y BODEGAS</p>
        </div>
        {tab === 'products' ? (
          <button onClick={() => { setEditingProduct(null); setForm({ sku: '', name: '', cost_buy: '', cost_sell: '', stock_min: '', stock_current: '', expiry_date: '', warehouse_id: '' }); setShowForm(true); }} className="btn-primary">
            <Plus size={16} /> Nuevo Producto
          </button>
        ) : (
          <button onClick={() => setShowWarehouseForm(true)} className="btn-primary">
            <Plus size={16} /> Nueva Bodega
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 stat-blue">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">PRODUCTOS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{products.length}</p>
        </div>
        <div className="glass-card p-4 stat-green">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">STOCK TOTAL</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{products.reduce((s, p) => s + (p.stock_current || 0), 0)}</p>
        </div>
        <div className="glass-card p-4 stat-yellow">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">BODEGAS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{warehouses.length}</p>
        </div>
        <div className="glass-card p-4 stat-pink">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">BAJO STOCK</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{products.filter(p => p.stock_current <= p.stock_min).length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('products')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'products' ? 'tab-active' : 'tab-inactive'}`}>Productos</button>
        <button onClick={() => setTab('warehouses')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'warehouses' ? 'tab-active' : 'tab-inactive'}`}>Bodegas</button>
      </div>

      {tab === 'products' ? (
        <div className="glass-card overflow-hidden">
          {products.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No hay productos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              {products.map((p) => (
                <div key={p.id} className="data-row gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : <Package size={24} className="text-gray-300" />}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 flex-1 items-start sm:items-center gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">SKU</p>
                      <p className="font-bold text-gray-800">{p.sku}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">PRODUCTO</p>
                      <p className="font-bold text-gray-800">{p.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">BODEGA</p>
                      <p className="font-bold text-gray-800 text-sm">{getWarehouseName(p.warehouse_id)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">STOCK</p>
                      <p className={`font-bold ${p.stock_current <= p.stock_min ? 'text-red-600' : 'text-gray-800'}`}>{p.stock_current} / {p.stock_min}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">COMPRA</p>
                      <p className="font-bold text-gray-800">{fmt(p.cost_buy)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">VENTA</p>
                      <p className="font-bold text-primary-600">{fmt(p.cost_sell)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 tracking-wider">UTILIDAD</p>
                      <p className="font-bold text-green-600">{p.profit_percentage?.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => editProduct(p)} className="p-2 rounded-lg hover:bg-gray-100"><Pencil size={16} className="text-gray-500" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 size={16} className="text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <MapPin size={20} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{w.name}</p>
                    <p className="text-sm text-gray-500">Ubicación: {w.location}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => loadWarehouseProducts(w.id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    {expandedWarehouse === w.id ? <ChevronUp size={16} className="text-primary-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  <button onClick={() => deleteWarehouse(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} className="text-red-400" /></button>
                </div>
              </div>
              {w.description && <p className="text-xs text-gray-400 mb-3">{w.description}</p>}

              {/* Products in warehouse */}
              {expandedWarehouse === w.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in">
                  <p className="text-xs font-semibold text-gray-400 tracking-wider mb-2">PRODUCTOS EN BODEGA</p>
                  {(warehouseProducts[w.id] || []).length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No hay productos asignados</p>
                  ) : (
                    <div className="space-y-2">
                      {(warehouseProducts[w.id] || []).map(p => (
                        <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                          <Package size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-700 flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-gray-400">{p.stock_current} uds</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">SKU</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Costo Compra</label><input type="number" step="0.01" value={form.cost_buy} onChange={(e) => setForm({ ...form, cost_buy: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Costo Venta</label><input type="number" step="0.01" value={form.cost_sell} onChange={(e) => setForm({ ...form, cost_sell: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Stock Actual</label><input type="number" value={form.stock_current} onChange={(e) => setForm({ ...form, stock_current: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Stock Mínimo</label><input type="number" value={form.stock_min} onChange={(e) => setForm({ ...form, stock_min: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Fecha Vencimiento</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Bodega</label>
                  <select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2">{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Form Modal */}
      {showWarehouseForm && (
        <div className="modal-overlay" onClick={() => setShowWarehouseForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Nueva Bodega</h3>
              <button onClick={() => setShowWarehouseForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={createWarehouse} className="space-y-3">
              <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-semibold mb-1">Ubicación</label><input value={whForm.location} onChange={(e) => setWhForm({ ...whForm, location: e.target.value })} required /></div>
              <div><label className="block text-sm font-semibold mb-1">Descripción</label><textarea value={whForm.description} onChange={(e) => setWhForm({ ...whForm, description: e.target.value })} rows={3} /></div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">Crear Bodega</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
