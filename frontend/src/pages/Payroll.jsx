import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { Plus, Trash2, DollarSign, X, Printer, Mail, User } from 'lucide-react';

export default function Payroll() {
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [liquidations, setLiquidations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showLiquidate, setShowLiquidate] = useState(null);
  const [form, setForm] = useState({ document: '', name: '', email: '', base_salary: '', start_date: '', eps: '', arl: '', pension: '', deduct_health: true, deduct_pension: true, deduct_arl: true });
  const [liqForm, setLiqForm] = useState({ days_worked: '30', extra_hours: '0' });
  const [lastLiquidation, setLastLiquidation] = useState(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const payslipRef = useRef();

  const loadData = async () => {
    const [e, l] = await Promise.all([api.get('/employees'), api.get('/payroll')]);
    setEmployees(e.data); setLiquidations(l.data);
  };
  useEffect(() => { loadData(); }, []);

  const createEmployee = async (e) => {
    e.preventDefault();
    await api.post('/employees', { ...form, base_salary: parseFloat(form.base_salary) });
    setShowForm(false); setForm({ document: '', name: '', email: '', base_salary: '', start_date: '', eps: '', arl: '', pension: '', deduct_health: true, deduct_pension: true, deduct_arl: true }); loadData();
  };

  const deleteEmployee = async (id) => {
    if (!confirm('¿Eliminar empleado?')) return;
    await api.delete(`/employees/${id}`); loadData();
  };

  const liquidate = async () => {
    if (!showLiquidate) return;
    try {
      const res = await api.post('/payroll/liquidate', { employee_id: showLiquidate.id, days_worked: parseInt(liqForm.days_worked), extra_hours: parseInt(liqForm.extra_hours) });
      setLastLiquidation({ ...res.data, employee: showLiquidate });
      setShowLiquidate(null);
      setLiqForm({ days_worked: '30', extra_hours: '0' });
      setShowPayslip(true);
      loadData();
    } catch (e) { alert(e.response?.data?.detail || 'Error al liquidar'); }
  };

  const printPayslip = () => {
    const win = window.open('', '', 'width=500,height=700');
    win.document.write(`<html><head><title>Comprobante de Nómina</title><style>
      body { font-family: 'Inter', sans-serif; padding: 24px; font-size: 12px; color: #333; }
      h2 { text-align: center; margin-bottom: 4px; font-size: 18px; }
      .subtitle { text-align: center; color: #888; font-size: 10px; letter-spacing: 2px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #eee; font-size: 11px; }
      th { font-weight: 600; color: #666; background: #f9fafb; }
      .section-title { font-weight: bold; font-size: 12px; margin-top: 16px; margin-bottom: 4px; color: #4f46e5; }
      .total { font-size: 18px; font-weight: bold; text-align: center; margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; }
      .footer { text-align: center; margin-top: 24px; color: #999; font-size: 9px; }
    </style></head><body>`);
    win.document.write(payslipRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
    win.close();
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Nómina</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">GESTIÓN DE EMPLEADOS Y LIQUIDACIONES</p>
        </div>
        {tab === 'employees' && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Vincular Empleado</button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 stat-blue">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">EMPLEADOS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{employees.filter(e => e.status === 'active').length}</p>
        </div>
        <div className="glass-card p-4 stat-green">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">LIQUIDACIONES</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{liquidations.length}</p>
        </div>
        <div className="glass-card p-4 stat-yellow">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">TOTAL PAGADO</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(liquidations.reduce((s, l) => s + (l.net_salary || 0), 0))}</p>
        </div>
        <div className="glass-card p-4 stat-pink">
          <p className="text-xs font-semibold text-gray-500 tracking-wider">COSTO EMPRESA</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(liquidations.reduce((s, l) => s + (l.employer_total_cost || 0), 0))}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('employees')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'employees' ? 'tab-active' : 'tab-inactive'}`}>Empleados</button>
        <button onClick={() => setTab('liquidations')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'liquidations' ? 'tab-active' : 'tab-inactive'}`}>Liquidaciones</button>
      </div>

      {tab === 'employees' && (
        <div className="glass-card overflow-hidden">
          {employees.length === 0 ? <p className="text-gray-400 text-center py-12">No hay empleados registrados</p> : employees.map((emp) => (
            <div key={emp.id} className="data-row gap-4">
              {/* Photo */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                {emp.photo_url ? <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" /> : emp.name?.charAt(0) || <User size={20} />}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start sm:items-center">
                <div><p className="text-xs font-semibold text-gray-400 tracking-wider">DOCUMENTO</p><p className="font-bold text-gray-800">{emp.document}</p></div>
                <div><p className="text-xs font-semibold text-gray-400 tracking-wider">NOMBRE</p><p className="font-bold text-gray-800">{emp.name}</p>{emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}</div>
                <div><p className="text-xs font-semibold text-gray-400 tracking-wider">SALARIO BASE</p><p className="font-bold text-primary-600">{fmt(emp.base_salary)}</p></div>
                <div><p className="text-xs font-semibold text-gray-400 tracking-wider">FECHA INICIO</p><p className="font-bold text-gray-800">{emp.start_date}</p></div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 tracking-wider">SEGURIDAD SOCIAL</p>
                  <p className="text-xs text-gray-600">EPS: {emp.eps} | ARL: {emp.arl}</p>
                  <p className="text-xs text-gray-600">Pensión: {emp.pension}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setShowLiquidate(emp); setLiqForm({ days_worked: '30', extra_hours: '0' }); }} className="btn-success text-sm"><DollarSign size={14} /> Liquidar</button>
                <button onClick={() => deleteEmployee(emp.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'liquidations' && (
        <div className="glass-card overflow-hidden">
          {liquidations.length === 0 ? <p className="text-gray-400 text-center py-12">No hay liquidaciones</p> : liquidations.map((l) => (
            <div key={l.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {l.employee_name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{l.employee_name}</p>
                    <p className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString('es-CO')} · {l.days_worked} días · {l.extra_hours} HE</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">{fmt(l.net_salary)}</p>
                  <p className="text-xs text-gray-400">Costo empresa: {fmt(l.employer_total_cost)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs bg-gray-50 rounded-lg p-3">
                <div><span className="text-gray-400">Salario Base:</span> <span className="font-semibold">{fmt(l.base_salary)}</span></div>
                <div><span className="text-gray-400">Horas Extra:</span> <span className="font-semibold">{fmt(l.extra_hours_pay)}</span></div>
                <div><span className="text-gray-400">Transporte:</span> <span className="font-semibold">{fmt(l.transport_subsidy)}</span></div>
                <div><span className="text-gray-400">Deducciones:</span> <span className="font-semibold text-red-500">-{fmt(l.total_deductions)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Vincular Empleado</h3><button onClick={() => setShowForm(false)}><X size={20} /></button></div>
            <form onSubmit={createEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Documento</label><input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Nombre</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="block text-sm font-semibold mb-1">Salario Base Mensual</label><input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} required /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">Fecha Inicio</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-semibold mb-1">EPS</label><input value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">ARL</label><input value={form.arl} onChange={(e) => setForm({ ...form, arl: e.target.value })} required /></div>
                <div><label className="block text-sm font-semibold mb-1">Pensión</label><input value={form.pension} onChange={(e) => setForm({ ...form, pension: e.target.value })} required /></div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-2.5">Vincular Empleado</button>
            </form>
          </div>
        </div>
      )}

      {/* Liquidate Modal */}
      {showLiquidate && (
        <div className="modal-overlay" onClick={() => setShowLiquidate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {showLiquidate.name?.charAt(0) || 'E'}
              </div>
              <div>
                <h3 className="text-xl font-bold">Liquidar Nómina</h3>
                <p className="text-sm text-gray-500">{showLiquidate.name} — {showLiquidate.document}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-semibold mb-1">Días Trabajados</label><input type="number" value={liqForm.days_worked} onChange={(e) => setLiqForm({ ...liqForm, days_worked: e.target.value })} /></div>
              <div><label className="block text-sm font-semibold mb-1">Horas Extra</label><input type="number" value={liqForm.extra_hours} onChange={(e) => setLiqForm({ ...liqForm, extra_hours: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowLiquidate(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={liquidate} className="flex-1 btn-success justify-center py-2.5">Liquidar</button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslip && lastLiquidation && (
        <div className="modal-overlay" onClick={() => setShowPayslip(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '28rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Comprobante de Nómina</h3>
              <button onClick={() => setShowPayslip(false)}><X size={20} /></button>
            </div>
            <div ref={payslipRef} className="print-area">
              <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>CheckAdmin</h2>
              <p style={{ textAlign: 'center', color: '#888', fontSize: '10px', letterSpacing: '2px', marginBottom: '16px' }}>COMPROBANTE DE NÓMINA</p>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{lastLiquidation.employee_name}</p>
                <p style={{ fontSize: '11px', color: '#666' }}>Doc: {lastLiquidation.employee?.document} | {new Date(lastLiquidation.created_at).toLocaleDateString('es-CO')}</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px' }}>Días trabajados</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px' }}>{lastLiquidation.days_worked}</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px' }}>Salario base</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px' }}>{fmt(lastLiquidation.base_salary)}</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px' }}>Horas extra ({lastLiquidation.extra_hours})</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px' }}>{fmt(lastLiquidation.extra_hours_pay)}</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px' }}>Subsidio transporte</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px' }}>{fmt(lastLiquidation.transport_subsidy)}</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px', color: '#dc2626' }}>Salud (4%)</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px', color: '#dc2626' }}>-{fmt(lastLiquidation.health_deduction)}</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px', color: '#dc2626' }}>Pensión (4%)</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px', color: '#dc2626' }}>-{fmt(lastLiquidation.pension_deduction)}</td></tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px', fontSize: '11px', color: '#dc2626' }}>ARL (0.522%)</td><td style={{ textAlign: 'right', padding: '6px', fontWeight: '600', fontSize: '11px', color: '#dc2626' }}>-{fmt(lastLiquidation.arl_deduction)}</td></tr>
                </tbody>
              </table>
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginTop: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Neto a pagar</p>
                <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a' }}>{fmt(lastLiquidation.net_salary)}</p>
              </div>
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '9px', color: '#999' }}>Este documento es un comprobante de pago de nómina generado por CheckAdmin</p>
            </div>
            <div className="flex gap-2 mt-5 no-print">
              <button onClick={printPayslip} className="flex-1 btn-primary justify-center py-2.5">
                <Printer size={16} /> Imprimir
              </button>
              <button onClick={async () => {
                const email = lastLiquidation.employee?.email || prompt('Ingrese el correo del empleado:');
                if (email) {
                  try {
                    await api.post('/payroll/send-email', {
                      email,
                      liquidation: lastLiquidation,
                      employee: lastLiquidation.employee || showLiquidate
                    });
                    alert(`Comprobante enviado exitosamente a ${email}`);
                  } catch (e) {
                    alert(e.response?.data?.detail || 'Error al enviar el comprobante');
                  }
                }
              }} className="flex-1 btn-success justify-center py-2.5">
                <Mail size={16} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
