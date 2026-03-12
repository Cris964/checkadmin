import { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { Building2, Users2, Search, ArrowDown, ArrowRight } from 'lucide-react';

export default function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompany, setExpandedCompany] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [compRes, usrRes] = await Promise.all([
        api.get('/superadmin/companies'),
        api.get('/superadmin/users')
      ]);
      setCompanies(compRes.data);
      setUsers(usrRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando datos de Superadministrador.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCompany = (companyId) => {
    if (expandedCompany === companyId) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(companyId);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Cargando datos maestros...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="text-indigo-600" size={36} />
            Panel Superadministrador
          </h1>
          <p className="text-xs tracking-widest text-gray-400 mt-2">CONTROL GLOBAL DE EMPRESAS Y USUARIOS</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar empresa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 stat-indigo">
           <p className="text-sm font-semibold text-indigo-200 tracking-wider mb-1 text-center">TOTAL EMPRESAS</p>
           <p className="text-4xl font-bold text-white text-center">{companies.length}</p>
        </div>
        <div className="glass-card p-6 stat-purple">
           <p className="text-sm font-semibold text-purple-200 tracking-wider mb-1 text-center">USUARIOS REGISTRADOS</p>
           <p className="text-4xl font-bold text-white text-center">{users.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500">
            No se encontraron empresas.
          </div>
        ) : (
          filteredCompanies.map(company => {
            const companyUsers = users.filter(u => u.company_id === company.id);
            const adminUser = companyUsers.find(u => u.role === 'admin');
            const isExpanded = expandedCompany === company.id;

            return (
              <div key={company.id} className="glass-card overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
                {/* Company Header */}
                <div 
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-white"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="text-indigo-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Creada: {new Date(company.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                    <div className="text-left md:text-right">
                       <p className="text-xs text-gray-400 font-semibold tracking-wider">ADMINISTRADOR</p>
                       <p className="text-sm font-medium text-gray-800">{adminUser ? adminUser.email : 'Sin Admin'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="badge badge-blue flex items-center gap-1">
                         <Users2 size={12} /> {companyUsers.length}
                       </span>
                       <button className="p-2 rounded-full hover:bg-gray-100 transition-colors ml-2">
                         {isExpanded ? <ArrowDown size={20} className="text-gray-500" /> : <ArrowRight size={20} className="text-gray-500" />}
                       </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Users List */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 p-5 animate-fade-in">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 px-2 uppercase tracking-wider">
                      Usuarios de {company.name}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {companyUsers.length === 0 ? (
                        <p className="text-sm text-gray-500 px-2">No hay usuarios registrados.</p>
                      ) : (
                        companyUsers.map(user => (
                          <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {user.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate text-sm">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              <div className="mt-2 text-[10px] font-bold tracking-widest uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-max">
                                {user.role}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
