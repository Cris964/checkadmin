import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Pencil, Trash2, Shield, X, User } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'user', label: 'Usuario' },
  { value: 'bodeguero', label: 'Bodeguero' },
  { value: 'operario', label: 'Operario' },
];

const PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales', label: 'Ventas' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'production', label: 'Producción' },
  { key: 'payroll', label: 'Nómina' },
  { key: 'finance', label: 'Finanzas' },
  { key: 'reports', label: 'Reportes' },
  { key: 'settings', label: 'Configuración' },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user', permissions: ['dashboard'] });

  const loadUsers = async () => {
    try {
      const res = await api.get('/users/company');
      setUsers(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: '', password: '', name: '', role: 'user', permissions: ['dashboard'] });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ email: u.email, password: '', name: u.name, role: u.role, permissions: u.permissions || [] });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { name: form.name, role: form.role, permissions: form.permissions };
        if (form.password) updateData.password = form.password;
        await api.put(`/users/company/${editingUser.id}`, updateData);
      } else {
        await api.post('/users/company', form);
      }
      setShowForm(false);
      loadUsers();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/users/company/${id}`);
      loadUsers();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const togglePermission = (key) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }));
  };

  const roleBadge = (role) => {
    const colors = { admin: 'badge-purple', user: 'badge-blue', bodeguero: 'badge-yellow', operario: 'badge-green' };
    return <span className={`badge ${colors[role] || 'badge-blue'}`}>{role}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando...</p></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">ROLES Y PERMISOS</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-xs text-gray-400 font-semibold tracking-wider mt-1">TOTAL</p>
        </div>
        <div className="glass-card p-4 text-center stat-purple">
          <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-xs text-gray-400 font-semibold tracking-wider mt-1">ADMINS</p>
        </div>
        <div className="glass-card p-4 text-center stat-blue">
          <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'user').length}</p>
          <p className="text-xs text-gray-400 font-semibold tracking-wider mt-1">USUARIOS</p>
        </div>
        <div className="glass-card p-4 text-center stat-green">
          <p className="text-2xl font-bold text-gray-900">{users.filter(u => ['bodeguero', 'operario'].includes(u.role)).length}</p>
          <p className="text-xs text-gray-400 font-semibold tracking-wider mt-1">OPERATIVOS</p>
        </div>
      </div>

      {/* Users List */}
      <div className="glass-card overflow-hidden">
        {users.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No hay usuarios registrados</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="data-row gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {u.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <div className="flex-shrink-0">{roleBadge(u.role)}</div>
              <div className="flex-shrink-0 text-xs text-gray-400">
                {(u.permissions || []).length} permisos
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-gray-100"><Pencil size={16} className="text-gray-500" /></button>
                <button onClick={() => deleteUser(u.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 size={16} className="text-red-500" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '28rem' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Correo Electrónico</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">{editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre Completo</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Permisos</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p.key)}
                        onChange={() => togglePermission(p.key)}
                        className="rounded"
                        style={{ width: 'auto' }}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2">
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
