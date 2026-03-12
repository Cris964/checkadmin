import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Factory, Users2,
  DollarSign, BarChart3, Settings, LogOut, Shield, Moon, Sun
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventas TPV' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/production', icon: Factory, label: 'Producción' },
  { to: '/payroll', icon: Users2, label: 'Nómina' },
  { to: '/finance', icon: DollarSign, label: 'Finanzas' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/users', icon: Shield, label: 'Usuarios' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="glass-card w-72 min-h-screen flex flex-col p-5 sticky top-0 overflow-y-auto no-print"
           style={{ borderRadius: '0 1rem 1rem 0', minWidth: '280px' }}>
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 relative mb-2">
          <div className="w-10 h-10 overflow-hidden rounded shadow-sm">
             <img src="/logo.png" alt="CheckAdmin Logo" className="w-[200%] h-[200%] max-w-none object-cover object-[0%_15%]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            ChekAdmin
          </h1>
        </div>
        <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mt-1 pl-1">ERP Industrial</p>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
          {user.name?.charAt(0) || 'U'}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-gray-800 truncate">{user.name || 'Usuario'}</p>
          <p className="text-xs text-gray-400 truncate">{user.email || ''}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'nav-active'
                  : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between px-2 py-3 mt-2 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
          <span>{isDark ? 'Oscuro' : 'Claro'}</span>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          className={`dark-toggle ${isDark ? 'active' : ''}`}
        >
          <div className="dark-toggle-knob" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all mt-2"
      >
        <LogOut size={20} />
        <span>Cerrar Sesión</span>
      </button>
    </aside>
  );
}
