import { useEffect, useState } from 'react';
import api from '../lib/api';
import { DollarSign, Package, Factory, Users2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando...</p></div>;

  const formatMoney = (n) => `$${(n || 0).toLocaleString('es-CO')}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs tracking-widest text-gray-400 mt-1">VISTA GENERAL DEL SISTEMA</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 stat-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 tracking-wider">CAJA MAYOR</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(stats?.cash_box)}</p>
            </div>
            <DollarSign className="text-green-600 opacity-60" size={28} />
          </div>
        </div>
        <div className="glass-card p-5 stat-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 tracking-wider">PRODUCTOS EN STOCK</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_products || 0}</p>
            </div>
            <Package className="text-blue-600 opacity-60" size={28} />
          </div>
        </div>
        <div className="glass-card p-5 stat-yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 tracking-wider">ÓRDENES DE PRODUCCIÓN</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.production_orders || 0}</p>
            </div>
            <Factory className="text-yellow-600 opacity-60" size={28} />
          </div>
        </div>
        <div className="glass-card p-5 stat-pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 tracking-wider">EMPLEADOS ACTIVOS</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.employees || 0}</p>
            </div>
            <Users2 className="text-pink-600 opacity-60" size={28} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Sales Chart */}
        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rendimiento Semanal</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.weekly_sales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(value) => [formatMoney(value), 'Ventas']}
                  contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Productos</h2>
          <div className="space-y-3">
            {(stats?.top_products || []).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos aún</p>
            )}
            {(stats?.top_products || []).map((product, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-700 flex-1">{product.product_name}</span>
                <span className="text-xs text-primary-600 font-semibold">{product.total_quantity} unidades</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
