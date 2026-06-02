import React, { useEffect, useState } from 'react';

const OrderPrintView = ({ order, recipe, rawMaterials, onClose }) => {
  // Extract data safely
  const ingredients = recipe?.ingredients || [];
  const packagings = recipe?.packaging_materials || [];
  const totalQty = ingredients.reduce((acc, ing) => acc + (parseFloat(ing.quantity) || 0), 0);
  
  // Try to find the image of the label/box if available
  const labelImage = recipe?.label_image_url;
  const boxImage = recipe?.box_image_url;
  const getUrl = (url) => url ? (url.startsWith('http') ? url : `https://checkadmin-api.onrender.com${url}`) : null;

  useEffect(() => {
    // When mounted, auto trigger print
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  return (
    <div className="print-view fixed inset-0 z-[9999] bg-white overflow-auto p-8 text-black text-xs font-sans">
      
      {/* Header Info - F-PN-013 structure */}
      <table className="w-full border-collapse border border-black text-center mb-4">
        <tbody>
          <tr>
            <td rowSpan="3" className="border border-black p-2 w-32">
              {/* Logo placeholder if needed, or leave empty as in excel */}
              <div className="font-bold text-lg text-gray-400">LOGO</div>
            </td>
            <td rowSpan="2" colSpan="3" className="border border-black p-2 font-bold text-sm uppercase">
              ORDEN DE PRODUCCION AREA DE LIQUIDOS Y POLVOS
            </td>
            <td className="border border-black p-1 font-bold text-left bg-gray-100">Código:</td>
            <td className="border border-black p-1 text-left">F-PN-013</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold text-left bg-gray-100">Versión:</td>
            <td className="border border-black p-1 text-left">01</td>
          </tr>
          <tr>
            <td colSpan="3" className="border border-black p-1 text-left"></td>
            <td className="border border-black p-1 font-bold text-left bg-gray-100">Vigencia:</td>
            <td className="border border-black p-1 text-left">22/09/23 a 22/09/27</td>
          </tr>
        </tbody>
      </table>

      {/* Main details */}
      <table className="w-full border-collapse border border-black mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-1 font-bold bg-gray-100 w-1/6">Orden No:</td>
            <td className="border border-black p-1 w-1/6">{order.id?.substring(0,6) || ''}</td>
            <td className="border border-black p-1 font-bold bg-gray-100 w-1/6">PRODUCTO:</td>
            <td className="border border-black p-1 font-bold w-1/6 uppercase">{recipe?.output_product_name}</td>
            <td className="border border-black p-1 font-bold bg-gray-100 w-1/6">TIEMPO MEZCLADO (MIN):</td>
            <td className="border border-black p-1 w-1/6">{order.stage_data?.pre_fabricacion?.tiempo_mezclado || ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold bg-gray-100">Cantidad a fabricar (mL o g):</td>
            <td className="border border-black p-1 text-center">{totalQty.toFixed(2)}</td>
            <td className="border border-black p-1 font-bold bg-gray-100">LOTE:</td>
            <td className="border border-black p-1 text-center font-bold">{order.lote || ''}</td>
            <td className="border border-black p-1 font-bold bg-gray-100">RESPONSABLE:</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold bg-gray-100">Cantidad a envasar (Unidades):</td>
            <td className="border border-black p-1 text-center">{order.quantity || recipe?.expected_quantity}</td>
            <td className="border border-black p-1 font-bold bg-gray-100">Fecha:</td>
            <td className="border border-black p-1 text-center">{new Date(order.created_at).toLocaleDateString()}</td>
            <td className="border border-black p-1 font-bold bg-gray-100">Vencimiento:</td>
            <td className="border border-black p-1 text-center font-bold text-red-600">{order.vencimiento || ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold bg-gray-100">Peso promedio (empaque):</td>
            <td className="border border-black p-1 text-center">{order.stage_data?.pre_fabricacion?.peso_volumen || ''}</td>
            <td className="border border-black p-1 font-bold bg-gray-100" colSpan="4"></td>
          </tr>
        </tbody>
      </table>

      {/* Raw Materials Table */}
      <table className="w-full border-collapse border border-black mb-4">
        <thead>
          <tr className="bg-gray-100 text-center font-bold">
            <td className="border border-black p-1 w-[10%]">Código</td>
            <td className="border border-black p-1 w-[35%]">Materia Prima Requerida</td>
            <td className="border border-black p-1 w-[10%]">Lote</td>
            <td className="border border-black p-1 w-[10%]">Fecha de Vencimiento</td>
            <td className="border border-black p-1 w-[15%]">Cantidad a usar (mL o g)</td>
            <td className="border border-black p-1 w-[10%]">Realizado por:</td>
            <td className="border border-black p-1 w-[10%]">Verificado por:</td>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, i) => {
            const mat = rawMaterials.find(m => m.id === ing.raw_material_id);
            return (
              <tr key={i} className="text-center">
                <td className="border border-black p-1">{mat?.sku || '-'}</td>
                <td className="border border-black p-1 text-left">{mat?.name || ing.raw_material_name}</td>
                <td className="border border-black p-1">{mat?.lote || ''}</td>
                <td className="border border-black p-1">{mat?.vencimiento || ''}</td>
                <td className="border border-black p-1">{ing.quantity} {ing.unit}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            );
          })}
          {/* Empty rows to fill space */}
          {Array.from({ length: Math.max(0, 5 - ingredients.length) }).map((_, i) => (
            <tr key={`empty-ing-${i}`}>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
            </tr>
          ))}
          <tr>
            <td colSpan="4" className="border border-black p-1 text-right font-bold bg-gray-100">Total:</td>
            <td className="border border-black p-1 text-center font-bold">{totalQty.toFixed(2)}</td>
            <td className="border border-black p-1" colSpan="2"></td>
          </tr>
        </tbody>
      </table>

      {/* Packaging Table */}
      <table className="w-full border-collapse border border-black mb-4">
        <thead>
          <tr className="bg-gray-100 text-center font-bold">
            <td className="border border-black p-1 w-[10%]">Código</td>
            <td className="border border-black p-1 w-[35%]">Material de Envase Requerido</td>
            <td className="border border-black p-1 w-[15%]">Lote</td>
            <td className="border border-black p-1 w-[10%]">Cantidad (Unidades)</td>
            <td className="border border-black p-1 w-[10%]">Cantidad Dispensada</td>
            <td className="border border-black p-1 w-[10%]">Realizado por:</td>
            <td className="border border-black p-1 w-[10%]">Verificado por:</td>
          </tr>
        </thead>
        <tbody>
          {packagings.map((pkg, i) => {
            const mat = rawMaterials.find(m => m.id === pkg.raw_material_id);
            return (
              <tr key={i} className="text-center">
                <td className="border border-black p-1">{mat?.sku || '-'}</td>
                <td className="border border-black p-1 text-left">{mat?.name || pkg.raw_material_name}</td>
                <td className="border border-black p-1">{mat?.lote || ''}</td>
                <td className="border border-black p-1">{pkg.quantity}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            );
          })}
          {Array.from({ length: Math.max(0, 4 - packagings.length) }).map((_, i) => (
            <tr key={`empty-pkg-${i}`}>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
              <td className="border border-black p-3"></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border border-black p-2 min-h-[60px] mb-4">
        <span className="font-bold">OBSERVACIONES:</span> {order.notes || ''}
      </div>

      {/* Visual references (Images) */}
      {(labelImage || boxImage) && (
        <div className="mt-4 border border-black p-2">
          <p className="font-bold mb-2">REFERENCIAS VISUALES:</p>
          <div className="flex gap-4">
            {labelImage && (
              <div className="border p-1">
                <p className="text-center font-bold bg-gray-100">Etiqueta</p>
                <img src={getUrl(labelImage)} alt="Etiqueta" className="max-h-40 object-contain mx-auto" />
              </div>
            )}
            {boxImage && (
              <div className="border p-1">
                <p className="text-center font-bold bg-gray-100">Caja</p>
                <img src={getUrl(boxImage)} alt="Caja" className="max-h-40 object-contain mx-auto" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close button (Hidden during print) */}
      <div className="mt-8 text-center no-print">
        <button onClick={onClose} className="bg-red-500 text-white px-6 py-2 font-bold rounded shadow">Cerrar Vista de Impresión</button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-view, .print-view * {
            visibility: visible;
          }
          .print-view {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            font-size: 10pt;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
};

export default OrderPrintView;
