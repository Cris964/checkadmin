import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Sun, Moon, MessageCircle, Camera } from 'lucide-react';

export default function Settings() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/me', form);
      const updated = { ...user, ...res.data };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/upload/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updated = { ...user, photo_url: res.data.image_url };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch (e) { toast.error('Error al subir imagen'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Configuración</h1>
        <p className="text-xs tracking-widest text-gray-400 mt-1">PERSONALIZA TU EXPERIENCIA</p>
      </div>

      {saved && <div className="toast toast-success">✓ Cambios guardados correctamente</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Edit */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Perfil</h2>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <label className="cursor-pointer relative group">
              <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0) || 'U'
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Camera size={14} />
              </div>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 mt-2">Clic para cambiar foto</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Appearance */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Apariencia</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon size={20} className="text-primary-500" /> : <Sun size={20} className="text-yellow-500" />}
                <div>
                  <p className="font-medium text-gray-800">Modo Oscuro</p>
                  <p className="text-xs text-gray-400">{darkMode ? 'Activado' : 'Desactivado'}</p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* WhatsApp Support */}
          <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Soporte VIP</h3>
            <p className="text-sm text-gray-600 mb-4">¿Necesitas ayuda? Contáctanos directamente por WhatsApp para soporte prioritario.</p>
            <a
              href="https://wa.me/573158022191"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <MessageCircle size={18} />
              Abrir WhatsApp
            </a>
            <p className="text-xs text-gray-500 text-center mt-2">+57 315 802 2191</p>
          </div>

          {/* System Info */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Información del Sistema</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Versión:</span><span className="font-semibold">2026 Edition</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-semibold">{user.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Rol:</span><span className="font-semibold capitalize">{user.role}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
