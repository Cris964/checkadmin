import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Eye, EyeOff, CheckCircle2, ShieldCheck, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email, password, name, company_name: companyName
      });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      <div className="glass-card max-w-4xl w-full grid md:grid-cols-2 overflow-hidden animate-fade-in"
           style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)' }}>
        {/* Left - Branding */}
        <div className="p-10 flex flex-col justify-center"
             style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'white' }}>
          <div className="mb-2">
            <h1 className="text-4xl font-extrabold mb-1 bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
              CheckAdmin
            </h1>
            <p className="text-xs tracking-[0.3em] text-indigo-300 mb-6">ERP INDUSTRIAL</p>
          </div>
          <p className="text-indigo-200 text-lg mb-8 leading-relaxed">
            Sistema ERP Industrial de última generación para la gestión integral de su empresa.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <span className="text-sm">Gestión completa de inventario y producción</span>
            </div>
            <div className="flex items-center gap-3 text-indigo-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                <BarChart3 size={16} className="text-blue-400" />
              </div>
              <span className="text-sm">Control financiero y reportes en tiempo real</span>
            </div>
            <div className="flex items-center gap-3 text-indigo-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                <ShieldCheck size={16} className="text-purple-400" />
              </div>
              <span className="text-sm">Multi-tenant, roles y permisos avanzados</span>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="p-10">
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                tab === 'login' ? 'tab-active' : 'tab-inactive'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                tab === 'register' ? 'tab-active' : 'tab-inactive'
              }`}
            >
              Registrarse
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 animate-fade-in border border-red-100">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Cargando...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre de la Empresa</label>
                <input
                  type="text"
                  placeholder="Mi Empresa S.A.S"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Cargando...
                  </span>
                ) : 'Crear Cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
