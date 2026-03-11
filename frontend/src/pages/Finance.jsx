import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Wallet, TrendingDown, X, Calendar, BarChart3, PieChart, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Finance() {
  const [tab, setTab] = useState('caja_menor');
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'caja_menor', payment_method: 'efectivo', card_detail: '', amount: '', description: '', category: '' });
  const [cajaMayor, setCajaMayor] = useState(null);
  const [balance, setBalance] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    const res = await api.get('/transactions');
    setTransactions(res.data);
  };

  const loadCajaMayor = async () => {
    try {
      let url = '/finance/caja-mayor';
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length) url += '?' + params.join('&');
      const res = await api.get(url);
      setCajaMayor(res.data);
    } catch (e) { console.error(e); }
  };

  const loadBalance = async () => {
    try {
      const res = await api.get('/finance/balance');
      setBalance(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); loadCajaMayor(); loadBalance(); }, []);

  const createTransaction = async (e) => {
    e.preventDefault();
    await api.post('/transactions', { ...form, amount: parseFloat(form.amount), category: form.category || null });
    setShowForm(false);
    setForm({ type: 'caja_menor', payment_method: 'efectivo', card_detail: '', amount: '', description: '', category: '' });
    loadData(); loadCajaMayor(); loadBalance();
  };

  const deleteTransaction = async (id) => {
    if (!confirm('¿Eliminar transacción?')) return;
    try { await api.delete(`/transactions/${id}`); loadData(); loadCajaMayor(); loadBalance(); } catch (e) { alert('Error'); }
  };

  const cajaItems = transactions.filter((t) => t.type === 'caja_menor');
  const gastoItems = transactions.filter((t) => t.type === 'pago' || t.type === 'gasto');
  const gastosFijos = gastoItems.filter(t => t.category === 'fijo');
  const gastosVariables = gastoItems.filter(t => t.category === 'variable');
  const totalCaja = cajaItems.reduce((s, t) => s + t.amount, 0);
  const totalGastos = gastoItems.reduce((s, t) => s + t.amount, 0);
  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`;

  const getItems = () => {
    if (tab === 'caja_menor') return cajaItems;
    if (tab === 'gastos') return gastoItems;
    if (tab === 'fijos') return gastosFijos;
    if (tab === 'variables') return gastosVariables;
    return [];
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">CONTROL FINANCIERO INTEGRAL</p>
        </div>
        <button onClick={() => { setForm({ ...form, type: tab === 'caja_menor' ? 'caja_menor' : 'gasto' }); setShowForm(true); }} className="btn-primary">
          <Plus size={16} /> Nueva Transacción
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 flex items-center justify-between stat-green">
          <div>
            <p className="text-xs font-semibold text-gray-500 tracking-wider">CAJA MENOR</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalCaja)}</p>
          </div>
          <ArrowUpRight size={24} className="text-green-500 opacity-60" />
        </div>
        <div className="glass-card p-5 flex items-center justify-between stat-pink">
          <div>
            <p className="text-xs font-semibold text-gray-500 tracking-wider">TOTAL EGRESOS</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalGastos)}</p>
          </div>
          <ArrowDownRight size={24} className="text-red-500 opacity-60" />
        </div>
        <div className="glass-card p-5 flex items-center justify-between stat-yellow">
          <div>
            <p className="text-xs font-semibold text-gray-500 tracking-wider">GASTOS FIJOS</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(gastosFijos.reduce((s, t) => s + t.amount, 0))}</p>
          </div>
          <PieChart size={24} className="text-yellow-600 opacity-60" />
        </div>
        <div className="glass-card p-5 flex items-center justify-between stat-blue">
          <div>
            <p className="text-xs font-semibold text-gray-500 tracking-wider">GASTOS VARIABLES</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(gastosVariables.reduce((s, t) => s + t.amount, 0))}</p>
          </div>
          <BarChart3 size={24} className="text-blue-500 opacity-60" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {[
          { key: 'caja_menor', label: 'Caja Menor' },
          { key: 'gastos', label: 'Pagos y Gastos' },
          { key: 'fijos', label: 'Gastos Fijos' },
          { key: 'variables', label: 'Gastos Variables' },
          { key: 'caja_mayor', label: 'Caja Mayor' },
          { key: 'balance', label: 'Balance General' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'caja_mayor') loadCajaMayor(); if (t.key === 'balance') loadBalance(); }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${tab === t.key ? 'tab-active' : 'tab-inactive'}`}>{t.label}</button>
        ))}
      </div>

      {/* Caja Mayor */}
      {tab === 'caja_mayor' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Desde</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Hasta</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <button onClick={loadCajaMayor} className="btn-primary py-2.5">
                <Calendar size={16} /> Filtrar
              </button>
            </div>
            {cajaMayor && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-semibold tracking-wider">INGRESOS (VENTAS)</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{fmt(cajaMayor.total_ingresos)}</p>
                  <p className="text-xs text-gray-400">{cajaMayor.num_ventas} ventas</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-semibold tracking-wider">CAJA MENOR</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{fmt(cajaMayor.total_caja_menor)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 font-semibold tracking-wider">TOTAL GASTOS</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{fmt(cajaMayor.total_gastos)}</p>
                  <p className="text-xs text-gray-400">{cajaMayor.num_transacciones} transacciones</p>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background: cajaMayor.balance >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                  <p className="text-xs text-gray-500 font-semibold tracking-wider">BALANCE</p>
                  <p className={`text-xl font-bold mt-1 ${cajaMayor.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(cajaMayor.balance)}</p>
                </div>
              </div>
            )}
          </div>
          {cajaMayor && (
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5 text-center">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">GASTOS FIJOS</p>
                <p className="text-2xl font-bold text-yellow-600">{fmt(cajaMayor.gastos_fijos)}</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">GASTOS VARIABLES</p>
                <p className="text-2xl font-bold text-blue-600">{fmt(cajaMayor.gastos_variables)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Balance General */}
      {tab === 'balance' && balance && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Balance General</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activos */}
              <div className="p-5 bg-green-50 rounded-xl">
                <h4 className="text-xs font-bold text-green-700 tracking-wider mb-3">ACTIVOS</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Inventario</span><span className="font-bold">{fmt(balance.activos?.inventario)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Caja</span><span className="font-bold">{fmt(balance.activos?.caja)}</span></div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Total Activos</span><span className="text-green-600">{fmt((balance.activos?.inventario || 0) + (balance.activos?.caja || 0))}</span></div>
                </div>
              </div>
              {/* Ingresos */}
              <div className="p-5 bg-blue-50 rounded-xl">
                <h4 className="text-xs font-bold text-blue-700 tracking-wider mb-3">INGRESOS</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Total Ventas</span><span className="font-bold text-blue-600">{fmt(balance.ingresos)}</span></div>
                </div>
              </div>
              {/* Egresos */}
              <div className="p-5 bg-red-50 rounded-xl">
                <h4 className="text-xs font-bold text-red-700 tracking-wider mb-3">EGRESOS</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Gastos</span><span className="font-bold">{fmt(balance.egresos?.gastos)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Nómina</span><span className="font-bold">{fmt(balance.egresos?.nomina)}</span></div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Total Egresos</span><span className="text-red-600">{fmt(balance.egresos?.total)}</span></div>
                </div>
              </div>
            </div>
            {/* Balance Neto */}
            <div className="mt-6 p-5 rounded-xl text-center" style={{ background: balance.balance_neto >= 0 ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>
              <p className="text-xs text-gray-600 font-bold tracking-wider">BALANCE NETO</p>
              <p className={`text-3xl font-bold mt-1 ${balance.balance_neto >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(balance.balance_neto)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Lists */}
      {['caja_menor', 'gastos', 'fijos', 'variables'].includes(tab) && (
        <div className="glass-card p-6">
          {getItems().length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay movimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {getItems().map((t) => (
                <div key={t.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'caja_menor' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {t.type === 'caja_menor' ? <ArrowUpRight size={16} className="text-green-600" /> : <ArrowDownRight size={16} className="text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{t.description}</p>
                    <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString('es-CO')} · {t.payment_method}
                      {t.category && <span className={`ml-2 badge ${t.category === 'fijo' ? 'badge-yellow' : 'badge-blue'}`}>{t.category}</span>}
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${t.type === 'caja_menor' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'caja_menor' ? '+' : '-'}{fmt(t.amount)}
                  </p>
                  <button onClick={() => deleteTransaction(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Nueva Transacción</h3><button onClick={() => setShowForm(false)}><X size={20} /></button></div>
            <form onSubmit={createTransaction} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="caja_menor">Caja Menor</option>
                  <option value="pago">Pago</option>
                  <option value="gasto">Gasto</option>
                </select>
              </div>
              {(form.type === 'pago' || form.type === 'gasto') && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Sin categoría</option>
                    <option value="fijo">Gasto Fijo</option>
                    <option value="variable">Gasto Variable</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">Método de Pago</label>
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Monto</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">Registrar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
