import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Factory, Users2,
  DollarSign, BarChart3, Settings, LogOut, Shield, Moon, Sun, X, Building2
} from 'lucide-react';

const getNavItems = (userEmail) => {
  const items = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/sales', icon: ShoppingCart, label: 'Ventas TPV' },
    { to: '/dashboard/inventory', icon: Package, label: 'Inventario' },
    { to: '/dashboard/production', icon: Factory, label: 'Producción' },
    { to: '/dashboard/payroll', icon: Users2, label: 'Nómina' },
    { to: '/dashboard/finance', icon: DollarSign, label: 'Finanzas' },
    { to: '/dashboard/reports', icon: BarChart3, label: 'Reportes' },
    { to: '/dashboard/users', icon: Shield, label: 'Usuarios' },
    { to: '/dashboard/settings', icon: Settings, label: 'Configuración' },
  ];
  if (userEmail === 'admin@chekadmin.com') {
    items.push({ to: '/dashboard/superadmin', icon: Building2, label: 'SuperAdmin' });
  }
  return items;
};

export default function Sidebar({ onClose }) {
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
      <div className="p-4 mb-2">
        <div className="flex items-center justify-between relative mb-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 flex items-center justify-center overflow-hidden flex-shrink-0 drop-shadow-sm">
                <img src="/logo-icon-trans.png" alt="ChekAdmin Icon" className="w-full h-full object-contain" />
             </div>
             <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
               ChekAdmin
             </h1>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 p-1">
              <X size={20} />
            </button>
          )}
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
        {getNavItems(user.email).map((item) => (
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
