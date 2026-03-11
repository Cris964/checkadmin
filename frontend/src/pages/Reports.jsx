import { useEffect, useState } from 'react';
import api from '../lib/api';
import { DollarSign, TrendingUp, Package, Users2, RefreshCw, Calendar } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes, productsRes, payrollRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/sales'),
        api.get('/products'),
        api.get('/payroll'),
      ]);
      setStats(statsRes.data);
      setSales(salesRes.data);
      setProducts(productsRes.data);
      setPayroll(payrollRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const fmt = (n) => `$ ${(n || 0).toLocaleString('es-CO')}`;
  const totalSales = sales.reduce((s, sale) => s + (sale.total || 0), 0);
  const avgSale = sales.length ? totalSales / sales.length : 0;
  const totalPayroll = payroll.reduce((s, l) => s + (l.net_salary || 0), 0);

  // Pie chart data from top products
  const pieData = (stats?.top_products || []).map((p) => ({ name: p.product_name, value: p.total_quantity }));

  // Bar chart data
  const barData = products.map((p) => ({ name: p.name, utilidad: p.profit_percentage || 0, costo: p.cost_buy }));

  // Payroll chart
  const payrollData = payroll.slice(-6).map((l) => ({ name: l.employee_name?.split(' ')[0] || '?', neto: l.net_salary || 0, deducciones: l.total_deductions || 0 }));

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando...</p></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Panel de Reportes</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">ANÁLISIS Y MÉTRICAS DEL NEGOCIO</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 glass-card px-3 py-1.5">
            <Calendar size={14} className="text-gray-400" />
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border-0 bg-transparent text-sm font-medium focus:ring-0 p-0">
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
            </select>
          </div>
          <button onClick={loadData} className="p-2 glass-card hover:bg-gray-50 rounded-xl"><RefreshCw size={18} className="text-gray-500" /></button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 stat-green">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-green-600" />
            <p className="text-xs font-semibold text-gray-500 tracking-wider">Total Ventas</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(totalSales)}</p>
        </div>
        <div className="glass-card p-4 stat-blue">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            <p className="text-xs font-semibold text-gray-500 tracking-wider">Venta Promedio</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(avgSale)}</p>
        </div>
        <div className="glass-card p-4 stat-purple">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-purple-600" />
            <p className="text-xs font-semibold text-gray-500 tracking-wider">Productos</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{products.length}</p>
        </div>
        <div className="glass-card p-4 stat-pink">
          <div className="flex items-center gap-2">
            <Users2 size={20} className="text-red-500" />
            <p className="text-xs font-semibold text-gray-500 tracking-wider">Costo Nómina</p>
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(totalPayroll)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales Trend */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Tendencia de Ventas</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.weekly_sales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip formatter={(v) => [fmt(v), 'Ventas']} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Pie */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Productos Más Vendidos</h3>
          {pieData.length === 0 ? <p className="text-gray-400 text-center py-16">Sin datos</p> : (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Profitability Bar */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Rentabilidad por Producto</h3>
          {barData.length === 0 ? <p className="text-gray-400 text-center py-16">Sin datos</p> : (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip />
                  <Bar dataKey="utilidad" fill="#22c55e" radius={[4, 4, 0, 0]} name="Utilidad %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Payroll Cost */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Costos de Nómina</h3>
          {payrollData.length === 0 ? <p className="text-gray-400 text-center py-16">Sin datos</p> : (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip formatter={(v) => [fmt(v)]} />
                  <Legend />
                  <Bar dataKey="neto" fill="#6366f1" radius={[4, 4, 0, 0]} name="Salario Neto" />
                  <Bar dataKey="deducciones" fill="#ef4444" radius={[4, 4, 0, 0]} name="Deducciones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
