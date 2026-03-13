import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle2, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';

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
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión');
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
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative font-sans overflow-hidden bg-slate-50">
      {/* Background Blobs */}
      <div className="bg-blobs">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>

      <div className="max-w-4xl w-full grid md:grid-cols-2 overflow-hidden animate-fade-in bg-white border border-slate-200 shadow-2xl rounded-[2.5rem]">
        {/* Left - Branding */}
        <div className="p-12 flex flex-col justify-center relative overflow-hidden text-white"
             style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10 w-full">
          <div className="mb-2">
            <div className="mb-8 flex justify-center lg:justify-start">
               <img src="/logo-full-trans.png" alt="ChekAdmin Logo" className="h-24 sm:h-28 w-auto object-contain drop-shadow-2xl" />
            </div>
            <p className="text-xs tracking-[0.3em] text-indigo-200 mb-6 font-semibold">ERP INDUSTRIAL</p>
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
      </div>

      {/* Right - Form */}
      <div className="p-12">
          {/* Logo Mobie/Title */}
          <div className="md:hidden flex flex-col items-center mb-6">
             <img src="/logo-icon-trans.png" alt="ChekAdmin" className="w-12 h-12 mb-2" />
             <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">ChekAdmin</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {tab === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            {tab === 'login' ? 'Ingresa tus credenciales para continuar.' : 'Únete al ERP industrial más potente.'}
          </p>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${
                tab === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${
                tab === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Registro
            </button>
          </div>

          <div className="mb-8">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setEmail('admin@demo.com');
                setPassword('Demo2026!');
                toast.info('Credenciales demo aplicadas');
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <Eye size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Ver Versión Demo</p>
                  <p className="text-xs text-indigo-400">Prueba todas las funciones</p>
                </div>
              </div>
              <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>


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
