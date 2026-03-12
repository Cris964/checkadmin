import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, ArrowRight, Shield, Zap, BarChart, Smartphone, Globe, CreditCard } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (plan) => {
    setLoading(true);
    // Simular el pago / pasarela de Stripe por ahora
    setTimeout(() => {
      toast.success(`¡Suscripción al plan ${plan} exitosa! Ahora puedes registrar tu empresa.`);
      navigate('/login');
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src="/logo-icon-trans.png" alt="ChekAdmin" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ChekAdmin
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Características</a>
              <a href="#pricing" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Precios</a>
              <a href="#about" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Nosotros</a>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/login')} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                Iniciar Sesión
              </button>
              <button onClick={() => navigate('/login')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5">
                Prueba Demo
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="animate-fade-in relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-medium text-sm mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Lanzamiento Oficial 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight mb-8">
            El ERP industrial que <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              transforma tu empresa
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Gestiona inventarios, ventas POS, nómina, finanzas y reportes desde un solo lugar. Simple, rápido y completamente responsivo.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onClick={() => { document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' }) }} className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2">
              Ver Precios <ArrowRight size={20} />
            </button>
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2">
              Probar Demo Gratis
            </button>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-40 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Todo lo que necesitas para crecer</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Módulos integrados diseñados específicamente para optimizar los procesos de manufactura, ventas y administración.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BarChart, title: 'Dashboard Analítico', desc: 'Métricas en tiempo real, rendimiento de ventas y control operativo de un vistazo.', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Zap, title: 'Punto de Venta (POS)', desc: 'Facturación rápida, control de caja menor, impresión de recibos y envío por correo.', color: 'text-amber-500', bg: 'bg-amber-50' },
              { icon: Shield, title: 'Inventarios y Bodegas', desc: 'Gestión multi-bodega, alertas de stock mínimo y trazabilidad de productos.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { icon: Globe, title: 'Módulo de Producción', desc: 'Creación de recetas (kits), control de costos y estados de órdenes de producción.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: CreditCard, title: 'Finanzas Integradas', desc: 'Caja menor, caja mayor, control de egresos fijos y variables, y balance neto.', color: 'text-pink-600', bg: 'bg-pink-50' },
              { icon: Smartphone, title: '100% Responsivo', desc: 'Úsalo desde tu celular, tablet o computador sin perder ninguna funcionalidad.', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${f.bg} ${f.color}`}>
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Planes Simples y Transparentes</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Empieza hoy mismo a digitalizar tu empresa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 hover:border-indigo-500 transition-colors">
              <h3 className="text-2xl font-bold mb-2">Mensual</h3>
              <p className="text-slate-400 mb-6">Ideal para empezar y conocer el sistema.</p>
              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-black">$49.000</span>
                <span className="text-slate-400 font-medium">cop / mes</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Usuarios ilimitados', 'Todos los módulos', 'Soporte vía WhatsApp', 'Actualizaciones gratis'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-400 flex-shrink-0" size={20} />
                    <span className="text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleSubscribe('Mensual')}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {loading ? 'Procesando...' : 'Suscribirse al Plan Mensual'}
              </button>
            </div>

            {/* Annual Plan (Featured) */}
            <div className="bg-gradient-to-b from-indigo-600 to-purple-800 rounded-3xl p-8 border border-indigo-400 relative transform md:-translate-y-4 shadow-2xl shadow-indigo-900/50">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-pink-500 to-orange-400 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                Ahorras 20%
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Anual</h3>
              <p className="text-indigo-200 mb-6">El mejor valor para empresas establecidas.</p>
              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">$470.000</span>
                <span className="text-indigo-200 font-medium">cop / año</span>
              </div>
              <ul className="space-y-4 mb-8">
                 {['Usuarios ilimitados', 'Todos los módulos', 'Soporte VIP Prioritario 24/7', 'Capacitación inicial', 'Reportes exportables a Excel'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-pink-300 flex-shrink-0" size={20} />
                    <span className="text-white">{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleSubscribe('Anual')}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-indigo-900 bg-white hover:bg-slate-100 transition-colors shadow-xl"
              >
                {loading ? 'Procesando...' : 'Suscribirse al Plan Anual'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-center border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
             <img src="/logo-icon-trans.png" alt="ChekAdmin" className="w-8 h-8 object-contain filter grayscale" />
             <span className="text-xl font-bold tracking-widest uppercase">ChekAdmin</span>
          </div>
          <p>© 2026 ChekAdmin ERP Industrial. Todos los derechos reservados.</p>
          <div className="mt-6 space-x-4">
            <a href="#" className="hover:text-white transition-colors">Términos Legales</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
