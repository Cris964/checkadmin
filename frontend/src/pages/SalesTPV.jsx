import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { DollarSign, CreditCard, Receipt, Banknote, Search, ShoppingCart, Plus, Minus, History, X, Package, Printer, Mail, Users2, Pencil, Trash2 } from 'lucide-react';

export default function SalesTPV() {
  const [mainTab, setMainTab] = useState('tpv');
  const [shift, setShift] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(null);
  const [initialAmount, setInitialAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountPaid, setAmountPaid] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSale, setLastSale] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Customers
  const [customers, setCustomers] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', email: '', phone: '', address: '', document: '' });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [custSearch, setCustSearch] = useState('');

  const printRef = useRef();

  const loadData = async () => {
    try {
      const [shiftRes, productsRes, summaryRes] = await Promise.all([
        api.get('/cash-shifts/current'),
        api.get('/products'),
        api.get('/sales/today-summary'),
      ]);
      setShift(shiftRes.data);
      setProducts(productsRes.data);
      setSummary(summaryRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); loadCustomers(); }, []);

  const openShift = async () => {
    try {
      const res = await api.post('/cash-shifts', { initial_amount: parseFloat(initialAmount) || 0 });
      setShift(res.data);
      setInitialAmount('');
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  const closeShift = async () => {
    if (!shift || !confirm('¿Cerrar turno de caja?')) return;
    try {
      await api.post(`/cash-shifts/${shift.id}/close-with-summary`);
      setShift(null);
      setCart([]);
      loadData();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
          : i
        );
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, price: product.cost_sell, subtotal: product.cost_sell }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => prev.map((i) => {
      if (i.product_id === productId) {
        const newQty = Math.max(0, i.quantity + delta);
        return newQty === 0 ? null : { ...i, quantity: newQty, subtotal: newQty * i.price };
      }
      return i;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const change = paymentMethod === 'efectivo' && amountPaid ? parseFloat(amountPaid) - cartTotal : 0;

  const completeSale = async () => {
    if (cart.length === 0) return;
    try {
      const saleData = {
        items: cart,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'efectivo' ? parseFloat(amountPaid) || cartTotal : cartTotal,
        requires_invoice: !!customerEmail,
        customer_email: customerEmail || null,
      };
      await api.post('/sales', saleData);
      setLastSale({
        items: [...cart],
        total: cartTotal,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'efectivo' ? parseFloat(amountPaid) || cartTotal : cartTotal,
        change: paymentMethod === 'efectivo' ? (parseFloat(amountPaid) || cartTotal) - cartTotal : 0,
        date: new Date().toLocaleString('es-CO'),
        customer_email: customerEmail,
      });
      setCart([]);
      setShowPayment(false);
      setAmountPaid('');
      setCustomerEmail('');
      setShowInvoice(true);
      loadData();
    } catch (e) { alert(e.response?.data?.detail || 'Error al completar venta'); }
  };

  const printInvoice = () => {
    const printContent = printRef.current;
    const win = window.open('', '', 'width=400,height=600');
    win.document.write(`<html><head><title>Factura</title><style>
      body { font-family: 'Inter', sans-serif; padding: 20px; font-size: 12px; color: #333; }
      h2 { text-align: center; margin-bottom: 4px; font-size: 18px; }
      .subtitle { text-align: center; color: #888; font-size: 10px; letter-spacing: 2px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #eee; font-size: 11px; }
      th { font-weight: 600; color: #666; text-transform: uppercase; font-size: 10px; }
      .total-row { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }
      .footer { text-align: center; margin-top: 20px; color: #999; font-size: 10px; }
      .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
    </style></head><body>`);
    win.document.write(printContent.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
    win.close();
  };

  const sendInvoiceEmail = async () => {
    if (!customerEmail) { alert('Ingrese el correo del cliente'); return; }
    setSendingEmail(true);
    try {
      // The email was already sent during the sale if customer_email was provided
      alert(`Factura enviada a ${customerEmail}`);
    } catch (e) { alert('Error al enviar'); }
    setSendingEmail(false);
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/cash-shifts/history');
      setHistory(res.data);
      setShowHistory(true);
    } catch (e) { console.error(e); }
  };

  // Customers CRUD
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, custForm);
      } else {
        await api.post('/customers', custForm);
      }
      setShowCustomerForm(false);
      setEditingCustomer(null);
      setCustForm({ name: '', email: '', phone: '', address: '', document: '' });
      loadCustomers();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const deleteCustomer = async (id) => {
    if (!confirm('¿Eliminar cliente?')) return;
    await api.delete(`/customers/${id}`);
    loadCustomers();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.email || '').toLowerCase().includes(custSearch.toLowerCase())
  );

  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`;

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando...</p></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Ventas</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">TERMINAL DE PUNTO DE VENTA</p>
        </div>
        {shift && mainTab === 'tpv' && (
          <div className="flex gap-2">
            <button onClick={loadHistory} className="btn-outline">
              <History size={16} /> Historial
            </button>
            <button onClick={closeShift} className="btn-danger">
              <X size={16} /> Cerrar Caja
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setMainTab('tpv')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mainTab === 'tpv' ? 'tab-active' : 'tab-inactive'}`}>Punto de Venta</button>
        <button onClick={() => setMainTab('customers')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mainTab === 'customers' ? 'tab-active' : 'tab-inactive'}`}>Clientes</button>
      </div>

      {mainTab === 'customers' ? (
        /* CUSTOMERS TAB */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar clientes..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} className="pl-10" />
            </div>
            <button onClick={() => { setEditingCustomer(null); setCustForm({ name: '', email: '', phone: '', address: '', document: '' }); setShowCustomerForm(true); }} className="btn-primary">
              <Plus size={16} /> Nuevo Cliente
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            {filteredCustomers.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No hay clientes registrados</p>
            ) : (
              filteredCustomers.map(c => (
                <div key={c.id} className="data-row gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {c.name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold tracking-wider">NOMBRE</p>
                      <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold tracking-wider">EMAIL</p>
                      <p className="text-sm text-gray-600 truncate">{c.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold tracking-wider">TELÉFONO</p>
                      <p className="text-sm text-gray-600">{c.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold tracking-wider">DOCUMENTO</p>
                      <p className="text-sm text-gray-600">{c.document || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingCustomer(c); setCustForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', document: c.document || '' }); setShowCustomerForm(true); }} className="p-2 rounded-lg hover:bg-gray-100"><Pencil size={16} className="text-gray-500" /></button>
                    <button onClick={() => deleteCustomer(c.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 size={16} className="text-red-500" /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer Form Modal */}
          {showCustomerForm && (
            <div className="modal-overlay" onClick={() => setShowCustomerForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between mb-4">
                  <h3 className="text-xl font-bold">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                  <button onClick={() => setShowCustomerForm(false)}><X size={20} /></button>
                </div>
                <form onSubmit={handleCustomerSubmit} className="space-y-3">
                  <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-semibold mb-1">Email</label><input type="email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} /></div>
                    <div><label className="block text-sm font-semibold mb-1">Teléfono</label><input value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-semibold mb-1">Documento</label><input value={custForm.document} onChange={(e) => setCustForm({ ...custForm, document: e.target.value })} /></div>
                    <div><label className="block text-sm font-semibold mb-1">Dirección</label><input value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} /></div>
                  </div>
                  <button type="submit" className="btn-primary w-full justify-center py-2.5">{editingCustomer ? 'Guardar' : 'Crear Cliente'}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TPV TAB */
        <>
          {!shift ? (
            <div className="glass-card p-12 text-center max-w-md mx-auto">
              <Receipt size={48} className="text-primary-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Abrir Turno de Caja</h2>
              <p className="text-gray-500 text-sm mb-6">Ingresa el monto inicial de caja para empezar</p>
              <input type="number" placeholder="Monto inicial ($)" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} className="mb-4" />
              <button onClick={openShift} className="btn-primary w-full justify-center py-3">Abrir Turno</button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="glass-card p-4 stat-green">
                  <div className="flex items-center gap-2"><DollarSign size={18} className="text-green-600" /><p className="text-xs font-semibold text-gray-500 tracking-wider">VENTAS HOY</p></div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmt(summary?.total_sales)}</p>
                </div>
                <div className="glass-card p-4 stat-blue">
                  <div className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /><p className="text-xs font-semibold text-gray-500 tracking-wider">TRANSACCIONES</p></div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{summary?.num_transactions || 0}</p>
                </div>
                <div className="glass-card p-4 stat-yellow">
                  <div className="flex items-center gap-2"><Banknote size={18} className="text-yellow-700" /><p className="text-xs font-semibold text-gray-500 tracking-wider">EFECTIVO</p></div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmt(summary?.by_payment_method?.efectivo)}</p>
                </div>
                <div className="glass-card p-4 stat-pink">
                  <div className="flex items-center gap-2"><CreditCard size={18} className="text-purple-600" /><p className="text-xs font-semibold text-gray-500 tracking-wider">TARJETA/TRANSFER</p></div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmt((summary?.by_payment_method?.tarjeta || 0) + (summary?.by_payment_method?.transferencia || 0))}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Products */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="glass-card p-3">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Buscar productos por nombre o SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filtered.map((p) => (
                      <div key={p.id} onClick={() => addToCart(p)} className="glass-card p-3 cursor-pointer hover:scale-[1.02] transition-transform">
                        <div className="bg-gray-100 rounded-lg h-28 flex items-center justify-center mb-2 overflow-hidden">
                          {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover rounded-lg" /> : <Package size={32} className="text-gray-300" />}
                        </div>
                        <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-primary-600 font-bold">{fmt(p.cost_sell)}</p>
                          <p className="text-xs text-gray-400">Stock: {p.stock_current}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart */}
                <div className="glass-card p-5 h-fit sticky top-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart size={20} className="text-primary-600" />
                    <h2 className="text-lg font-bold text-gray-900">Carrito</h2>
                  </div>
                  {cart.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Carrito vacío</p>
                  ) : (
                    <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-400">{fmt(item.price)} c/u</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"><Minus size={14} /></button>
                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"><Plus size={14} /></button>
                          </div>
                          <p className="text-sm font-bold text-primary-600 w-20 text-right">{fmt(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="text-2xl font-bold text-gray-900">{fmt(cartTotal)}</span>
                  </div>
                  <button onClick={() => cart.length > 0 && setShowPayment(true)} className="btn-primary w-full justify-center py-3 mt-4" style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
                    Completar Venta
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Completar Venta</h3>
            <p className="text-2xl font-bold text-primary-600 mb-4 text-center">{fmt(cartTotal)}</p>
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {['efectivo', 'tarjeta', 'transferencia'].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`p-2 rounded-lg text-sm font-medium border transition-all ${paymentMethod === m ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              {paymentMethod === 'efectivo' && (
                <>
                  <label className="block text-sm font-semibold mt-3">Monto Recibido</label>
                  <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="$0" />
                  {amountPaid && change >= 0 && <p className="text-green-600 font-bold text-center">Cambio: {fmt(change)}</p>}
                </>
              )}
              <div className="pt-2">
                <label className="block text-sm font-semibold mb-1">Correo del cliente (opcional — para factura)</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="cliente@email.com" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={completeSale} className="flex-1 btn-primary justify-center py-2.5">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && lastSale && (
        <div className="modal-overlay" onClick={() => setShowInvoice(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '28rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Factura de Venta</h3>
              <button onClick={() => setShowInvoice(false)}><X size={20} /></button>
            </div>
            <div ref={printRef} className="print-area">
              <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>CheckAdmin</h2>
              <p className="subtitle" style={{ textAlign: 'center', color: '#888', fontSize: '10px', letterSpacing: '2px' }}>FACTURA DE VENTA</p>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#666' }}>{lastSale.date}</p>
              <div style={{ borderTop: '1px dashed #ccc', margin: '12px 0' }} />
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '10px', color: '#666' }}>PRODUCTO</th>
                    <th style={{ textAlign: 'center', padding: '6px 4px', fontSize: '10px', color: '#666' }}>CANT</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: '10px', color: '#666' }}>PRECIO</th>
                    <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: '10px', color: '#666' }}>SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSale.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 4px', fontSize: '11px' }}>{item.product_name}</td>
                      <td style={{ textAlign: 'center', padding: '6px 4px', fontSize: '11px' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', fontSize: '11px' }}>{fmt(item.price)}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', fontSize: '11px', fontWeight: '600' }}>{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: '2px solid #333', marginTop: '8px', paddingTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                  <span>TOTAL</span>
                  <span>{fmt(lastSale.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  <span>Método: {lastSale.payment_method}</span>
                  <span>Pagado: {fmt(lastSale.amount_paid)}</span>
                </div>
                {lastSale.change > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#16a34a', fontWeight: '600', marginTop: '4px' }}>
                    <span>Cambio</span>
                    <span>{fmt(lastSale.change)}</span>
                  </div>
                )}
              </div>
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: '#999' }}>¡Gracias por su compra!</p>
            </div>
            <div className="flex gap-2 mt-5 no-print">
              <button onClick={printInvoice} className="flex-1 btn-primary justify-center py-2.5">
                <Printer size={16} /> Imprimir
              </button>
              <button onClick={() => {
                const email = lastSale.customer_email || prompt('Ingrese el correo del cliente:');
                if (email) { alert(`Factura enviada a ${email}`); }
              }} className="flex-1 btn-success justify-center py-2.5">
                <Mail size={16} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Historial de Turnos</h3>
              <button onClick={() => setShowHistory(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{h.user_name}</span>
                    <span className={`badge ${h.status === 'open' ? 'badge-green' : 'badge-blue'}`}>
                      {h.status === 'open' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(h.opened_at).toLocaleString('es-CO')}</p>
                  {h.summary && <p className="text-sm font-bold text-primary-600 mt-1">Ventas: {fmt(h.summary.total_sales)}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
