import { useEffect, useState } from 'react';
import api, { getAssetUrl } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, MapPin, X, Maximize2, ChevronDown, ChevronUp, Download, Upload, Search } from 'lucide-react';

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
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [managingWarehouse, setManagingWarehouse] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const loadData = async () => {
    const [p, w] = await Promise.all([
      api.get('products').catch(() => ({ data: [] })), 
      api.get('warehouses').catch(() => ({ data: [] }))
    ]);
    setProducts(p.data || []);
    setWarehouses(w.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const loadWarehouseProducts = async (warehouseId) => {
    if (expandedWarehouse === warehouseId) {
      setExpandedWarehouse(null);
      return;
    }
    try {
      const res = await api.get(`warehouses/${warehouseId}/products`);
      setWarehouseProducts(prev => ({ ...prev, [warehouseId]: res.data }));
      setExpandedWarehouse(warehouseId);
    } catch (e) { console.error(e); }
  };

    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
      }
    };

    const handleSubmitProduct = async (e) => {
      e.preventDefault();
      setUploading(true);
      const data = {
        ...form,
        cost_buy: parseFloat(form.cost_buy),
        cost_sell: parseFloat(form.cost_sell),
        stock_min: parseInt(form.stock_min),
        stock_current: parseInt(form.stock_current),
        warehouse_id: form.warehouse_id || null
      };
      try {
        let productId = editingProduct?.id;
        if (editingProduct) {
          await api.put(`products/${editingProduct.id}`, data);
        } else {
          const res = await api.post('products', data);
          productId = res.data.id;
        }

        // Upload image if selected
        if (selectedFile && productId) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          await api.post(`upload/product-image/${productId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        setShowForm(false);
        setEditingProduct(null);
        setSelectedFile(null);
        setForm({ sku: '', name: '', cost_buy: '', cost_sell: '', stock_min: '', stock_current: '', expiry_date: '', warehouse_id: '' });
        loadData();
        toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
      } catch (e) { 
        toast.error(e.response?.data?.detail || 'Error al guardar producto'); 
      } finally {
        setUploading(false);
      }
    };

  const editProduct = (p) => {
    setEditingProduct(p);
    setForm({ sku: p.sku, name: p.name, cost_buy: p.cost_buy, cost_sell: p.cost_sell, stock_min: p.stock_min, stock_current: p.stock_current, expiry_date: p.expiry_date || '', warehouse_id: p.warehouse_id || '' });
    setShowForm(true);
  };

  const deleteProduct = async (id) => {
    if (!confirm('¿Eliminar producto?')) return;
    await api.delete(`products/${id}`);
    loadData();
    toast.success('Producto eliminado');
  };

  const createWarehouse = async (e) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.put(`warehouses/${editingWarehouse.id}`, whForm);
        toast.success('Bodega actualizada');
      } else {
        await api.post('warehouses', whForm);
        toast.success('Bodega creada');
      }
      setShowWarehouseForm(false);
      setWhForm({ name: '', location: '', description: '' });
      setEditingWarehouse(null);
      loadData();
    } catch (e) {
      toast.error('Error al guardar bodega');
    }
  };

  const editWarehouse = (w) => {
    setEditingWarehouse(w);
    setWhForm({ name: w.name, location: w.location, description: w.description || '' });
    setShowWarehouseForm(true);
  };

  const toggleProductWarehouse = async (product, warehouseId) => {
    try {
      await api.put(`products/${product.id}`, { ...product, warehouse_id: warehouseId });
      loadData();
      toast.success(warehouseId ? 'Producto asignado a bodega' : 'Producto removido de bodega');
    } catch (e) {
      toast.error('Error al mover producto');
    }
  };

  const deleteWarehouse = async (id) => {
    if (!confirm('¿Eliminar bodega?')) return;
    await api.delete(`warehouses/${id}`);
    loadData();
    toast.success('Bodega eliminada');
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`;
  const getWarehouseName = (id) => (warehouses || []).find(w => w.id === id)?.name || '—';

  const handleExport = async () => {
    try {
      const response = await api.get('products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'productos_chekadmin.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel exportado correctamente');
    } catch (e) {
      toast.error('Error al exportar inventario');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    
    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    
    try {
      const res = await api.post('products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${res.data.message}: ${res.data.imported} creados, ${res.data.updated} actualizados`);
      if (res.data.errors?.length > 0) {
        console.warn('Errores en importación:', res.data.errors);
        toast.info(`Se encontraron ${res.data.errors.length} errores menores.`);
      }
      setShowImportModal(false);
      setImportFile(null);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error en la importación');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["SKU", "Nombre", "Costo Compra", "Costo Venta", "Stock Actual", "Stock Minimo", "Fecha Vencimiento", "Bodega"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_inventario.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Inventario</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">GESTIÓN DE PRODUCTOS Y BODEGAS</p>
        </div>
        {tab === 'products' ? (
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary" title="Exportar a Excel">
              <Download size={16} /> Exportar
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary" title="Importar desde Excel">
              <Upload size={16} /> Importar
            </button>
            <button onClick={() => { setEditingProduct(null); setForm({ sku: '', name: '', cost_buy: '', cost_sell: '', stock_min: '', stock_current: '', expiry_date: '', warehouse_id: '' }); setShowForm(true); }} className="btn-primary">
              <Plus size={16} /> Nuevo Producto
            </button>
          </div>
        ) : (
          <button onClick={() => { setEditingWarehouse(null); setWhForm({ name: '', location: '', description: '' }); setShowWarehouseForm(true); }} className="btn-primary">
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
                <div key={p.id} className="data-row gap-4 group">
                  <div 
                    className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer relative group-hover:shadow-lg transition-all"
                    onClick={() => p.image_url && setLightboxImage(getAssetUrl(p.image_url))}
                  >
                    {p.image_url && typeof p.image_url === 'string' ? (
                      <>
                        <img 
                          src={getAssetUrl(p.image_url)} 
                          alt={p.name} 
                          className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                          <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : (
                      <Package size={32} className="text-gray-300" />
                    )}
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
                  <button onClick={() => editWarehouse(w)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar Bodega"><Pencil size={16} className="text-gray-500" /></button>
                  <button onClick={() => loadWarehouseProducts(w.id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Ver Contenido">
                    {expandedWarehouse === w.id ? <ChevronUp size={16} className="text-primary-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  <button onClick={() => deleteWarehouse(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Bodega"><Trash2 size={16} className="text-red-400" /></button>
                </div>
              </div>
              {w.description && <p className="text-xs text-gray-400 mb-3">{w.description}</p>}
              <button 
                onClick={() => setManagingWarehouse(w)} 
                className="w-full text-xs font-semibold py-1.5 mb-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors uppercase tracking-wider"
              >
                Gestionar Productos
              </button>

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
              <div>
                <label className="block text-sm font-semibold mb-1">Imagen del Producto</label>
                <div className="flex items-center gap-3 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="product-image-upload" />
                  <label htmlFor="product-image-upload" className="btn-secondary text-xs cursor-pointer py-1.5 px-3">
                    {selectedFile ? 'Cambiar Imagen' : 'Seleccionar Archivo'}
                  </label>
                  {selectedFile ? (
                    <span className="text-xs text-gray-600 truncate flex-1">{selectedFile.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400 flex-1">Formatos: JPG, PNG, WEBP</span>
                  )}
                  {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>}
                </div>
                {editingProduct?.image_url && !selectedFile && (
                  <p className="text-[10px] text-gray-500 mt-1">El producto ya tiene una imagen. Subir una nueva la reemplazará.</p>
                )}
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
              <h3 className="text-xl font-bold">{editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}</h3>
              <button onClick={() => { setShowWarehouseForm(false); setEditingWarehouse(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={createWarehouse} className="space-y-3">
              <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-semibold mb-1">Ubicación</label><input value={whForm.location} onChange={(e) => setWhForm({ ...whForm, location: e.target.value })} required /></div>
              <div><label className="block text-sm font-semibold mb-1">Descripción</label><textarea value={whForm.description} onChange={(e) => setWhForm({ ...whForm, description: e.target.value })} rows={3} /></div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">{editingWarehouse ? 'Guardar Cambios' : 'Crear Bodega'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Warehouse Products Modal */}
      {managingWarehouse && (
        <div className="modal-overlay" onClick={() => setManagingWarehouse(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Gestionar Productos</h3>
                <p className="text-sm text-gray-500 mt-1">Bodega: <span className="font-semibold text-primary-600">{managingWarehouse.name}</span></p>
              </div>
              <button onClick={() => setManagingWarehouse(null)}><X size={20} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 h-[400px]">
              {/* Productos en la bodega */}
              <div className="flex flex-col border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                <div className="bg-gray-200 px-3 py-2 border-b border-gray-300">
                  <p className="text-xs font-bold text-gray-700 tracking-wider">EN ESTA BODEGA</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {products.filter(p => p.warehouse_id === managingWarehouse.id).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 shadow-sm text-sm">
                      <span className="font-medium text-gray-700 truncate mr-2" title={p.name}>{p.name} <span className="text-gray-400 ml-1">({p.stock_current})</span></span>
                      <button onClick={() => toggleProductWarehouse(p, null)} className="text-red-500 hover:text-red-700 font-semibold text-xs px-2 py-1 rounded bg-red-50">Sacar</button>
                    </div>
                  ))}
                  {products.filter(p => p.warehouse_id === managingWarehouse.id).length === 0 && (
                    <p className="text-xs text-center text-gray-400 mt-8">Bodega vacía</p>
                  )}
                </div>
              </div>

              {/* Productos disponibles */}
              <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-700 tracking-wider">DISPONIBLES (OTRAS BODEGAS)</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {products.filter(p => p.warehouse_id !== managingWarehouse.id).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100 text-sm hover:bg-white transition-colors">
                      <div className="flex flex-col overflow-hidden mr-2">
                        <span className="font-medium text-gray-700 truncate" title={p.name}>{p.name}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 truncate">{getWarehouseName(p.warehouse_id)}</span>
                      </div>
                      <button onClick={() => toggleProductWarehouse(p, managingWarehouse.id)} className="text-primary-600 hover:text-primary-800 font-semibold text-xs px-2 py-1 rounded bg-primary-50">Meter</button>
                    </div>
                  ))}
                  {products.filter(p => p.warehouse_id !== managingWarehouse.id).length === 0 && (
                    <p className="text-xs text-center text-gray-400 mt-8">No hay otros productos</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Importar Inventario</h3>
              <button onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
                <p className="text-sm text-primary-800">
                  Sube un archivo Excel (.xlsx) para actualizar o crear productos masivamente. Use el SKU como identificador único.
                </p>
                <button onClick={downloadTemplate} className="text-xs font-bold text-primary-600 mt-2 flex items-center gap-1 hover:underline">
                  <FileText size={12} /> Descargar plantilla ejemplo
                </button>
              </div>
              
              <form onSubmit={handleImport} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors bg-gray-50">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={(e) => setImportFile(e.target.files[0])} 
                    className="hidden" 
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-3">
                      <Upload className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {importFile ? importFile.name : 'Haz clic para seleccionar archivo'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Soporta .xlsx y .xls</p>
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowImportModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button 
                    type="submit" 
                    disabled={!importFile || importing} 
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {importing ? 'Importando...' : 'Iniciar Importación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="modal-overlay z-[100]" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X size={32} />
            </button>
            <img 
              src={lightboxImage} 
              alt="Preview" 
              className="w-full h-auto rounded-2xl shadow-2xl animate-scale-in"
            />
          </div>
        </div>
      )}
    </div>
  );
}
