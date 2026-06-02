import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdvanceStageModal = ({ order, currentStage, nextStage, onClose, onAdvance }) => {
  const [formData, setFormData] = useState({
    despejeAlistamiento: false,
    pesajeOk: false,
    pesajeFirma: '',
    despejeFabricacion: false,
    desinfeccionOk: false,
    desinfeccionObs: '',
    aguaPh: '',
    aguaConductividad: '',
    aguaCloro: '',
    bphUniformeCompleto: false,
    bphUniformeLimpio: false,
    bphHigienePersonal: false,
    bphSinMaquillaje: false,
    bphSinAccesorios: false,
    bphObservaciones: '',
    bphOperario: '',
    tiempoMezclado: '',
    pesoVolumen: '',
    recepcionCantidad: order.quantity || '',
    recepcionFirma: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};

    if (currentStage === 'montada') {
      if (!formData.despejeAlistamiento) return toast.error('Debe validar el despeje de rea');
      payload.form_despeje_alistamiento = { checked: true, date: new Date().toISOString() };
    } 
    else if (currentStage === 'alistamiento') {
      if (!formData.pesajeOk) return toast.error('Debe marcar OK en el pesaje');
      if (!formData.pesajeFirma) return toast.error('Firma requerida');
      payload.form_pesaje_firma = { ok: true, firma: formData.pesajeFirma, date: new Date().toISOString() };
    } 
    else if (currentStage === 'pesaje') {
      if (!formData.despejeFabricacion) return toast.error('Debe validar el despeje de fabricacin');
      if (!formData.desinfeccionOk) return toast.error('Debe validar la desinfeccin');
      if (!formData.aguaPh || !formData.aguaConductividad || !formData.aguaCloro) return toast.error('Datos de agua incompletos');
      if (!formData.bphOperario) return toast.error('Debe ingresar el nombre del operario en BPH');
      const allBphChecked = formData.bphUniformeCompleto && formData.bphUniformeLimpio && formData.bphHigienePersonal && formData.bphSinMaquillaje && formData.bphSinAccesorios;
      if (!allBphChecked && !formData.bphObservaciones) return toast.error('Debe ingresar observaciones si algún criterio BPH no cumple');
      
      payload.form_despeje_fabricacion = { checked: true };
      payload.form_desinfeccion = { checked: true, obs: formData.desinfeccionObs };
      payload.form_agua = { ph: formData.aguaPh, conductividad: formData.aguaConductividad, cloro: formData.aguaCloro };
      payload.form_higiene = { operario: formData.bphOperario, uniformeCompleto: formData.bphUniformeCompleto, uniformeLimpio: formData.bphUniformeLimpio, higienePersonal: formData.bphHigienePersonal, sinMaquillaje: formData.bphSinMaquillaje, sinAccesorios: formData.bphSinAccesorios, observaciones: formData.bphObservaciones, cumple: allBphChecked };
    }
    else if (currentStage === 'pre_fabricacion') {
      if (!formData.tiempoMezclado) return toast.error('Tiempo de mezclado requerido');
      if (!formData.pesoVolumen) return toast.error('Control de peso y volumen requerido');
      payload.form_tiempos_mezclado = { valor: formData.tiempoMezclado };
      payload.form_peso_volumen = { valor: formData.pesoVolumen };
    }
    else if (currentStage === 'etiquetado') { // advancing to terminada
      if (!formData.recepcionFirma) return toast.error('Firma de recepcin requerida');
      payload.form_recepcion_bodega = { firma: formData.recepcionFirma, cantidad: formData.recepcionCantidad };
      payload.actual_output = parseFloat(formData.recepcionCantidad) || order.quantity;
    }

    onAdvance(order.id || order._id, nextStage, payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scale-up">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Avanzar a: <span className="uppercase text-primary-600">{nextStage.replace('_', ' ')}</span></h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {currentStage === 'montada' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="despejeAlistamiento" checked={formData.despejeAlistamiento} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-900">Validar Despeje de rea de Alistamiento</span>
              </label>
            </div>
          )}

          {currentStage === 'alistamiento' && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="pesajeOk" checked={formData.pesajeOk} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">Pesaje Validado (OK)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Firma Digital (Responsable)</label>
                <input type="text" name="pesajeFirma" value={formData.pesajeFirma} onChange={handleChange} placeholder="Nombre / PIN" className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white" />
              </div>
            </div>
          )}

          {currentStage === 'pesaje' && (
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="despejeFabricacion" checked={formData.despejeFabricacion} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-900">1. Despeje de rea de Fabricacin</span>
                </label>
                <div className="border-t border-orange-200 pt-2"></div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="desinfeccionOk" checked={formData.desinfeccionOk} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-900">2. Formato de Desinfeccin (OK)</span>
                </label>
                <input type="text" name="desinfeccionObs" value={formData.desinfeccionObs} onChange={handleChange} placeholder="Observaciones de desinfeccin (opcional)" className="w-full text-xs p-1.5 border rounded" />
                <div className="border-t border-orange-200 pt-2"></div>
                <span className="text-sm font-semibold text-orange-900 block mb-2">3. Control de Agua</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase">pH</label>
                    <input type="number" step="0.01" name="aguaPh" value={formData.aguaPh} onChange={handleChange} className="w-full text-sm p-1.5 border rounded" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Cond.</label>
                    <input type="number" step="0.01" name="aguaConductividad" value={formData.aguaConductividad} onChange={handleChange} className="w-full text-sm p-1.5 border rounded" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Cloro</label>
                    <input type="number" step="0.01" name="aguaCloro" value={formData.aguaCloro} onChange={handleChange} className="w-full text-sm p-1.5 border rounded" />
                  </div>
                </div>
                <div className="border-t border-orange-200 pt-2"></div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="higieneOk" checked={formData.higieneOk} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-900">4. Buenas Prcticas de Higiene (OK)</span>
                </label>
              </div>
            </div>
          )}

          {currentStage === 'pre_fabricacion' && (
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-semibold mb-1">Control de tiempos de mezclado (minutos/horas)</label>
                <input type="text" name="tiempoMezclado" value={formData.tiempoMezclado} onChange={handleChange} placeholder="Ej: 45 minutos" className="w-full p-2 border rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Control de peso y volumen</label>
                <input type="text" name="pesoVolumen" value={formData.pesoVolumen} onChange={handleChange} placeholder="Ej: Cumple 250ml" className="w-full p-2 border rounded-lg bg-gray-50" />
              </div>
            </div>
          )}

          {currentStage === 'mezclado_llenado' && (
            <div className="text-center p-4">
              <p className="text-sm text-gray-600">Pasar directamente a etapa de etiquetado.</p>
            </div>
          )}

          {currentStage === 'etiquetado' && (
            <div className="space-y-4">
               <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-bold text-green-800 mb-2">Recepcin en Bodega (Producto Terminado)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-green-700">Cantidad Recibida</label>
                    <input type="number" name="recepcionCantidad" value={formData.recepcionCantidad} onChange={handleChange} className="w-full p-2 text-sm border rounded bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-green-700">Firma Digital (Bodega)</label>
                    <input type="text" name="recepcionFirma" value={formData.recepcionFirma} onChange={handleChange} placeholder="Nombre / PIN de quien recibe" className="w-full p-2 text-sm border rounded bg-white" />
                  </div>
                </div>
               </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="btn-primary px-6 py-2">Confirmar Avance</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvanceStageModal;
