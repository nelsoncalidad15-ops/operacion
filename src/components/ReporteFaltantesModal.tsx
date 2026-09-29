import React from 'react';
import { Printer, AlertTriangle, X, CheckCircle2, Download } from 'lucide-react';
import { StockItem } from '../types';

interface ReporteFaltantesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockList: StockItem[];
  provinciaFiltro: string;
}

export const ReporteFaltantesModal: React.FC<ReporteFaltantesModalProps> = ({
  isOpen,
  onClose,
  stockList,
  provinciaFiltro,
}) => {
  if (!isOpen) return null;

  // Filtrar insumos faltantes o críticos
  const faltantes = stockList.filter(
    (item) => item.estado === 'CRITICO' || item.estado === 'CERCA_MINIMO' || item.cantidadReponer > 0
  );

  // Ordenar primero los más críticos y con mayor necesidad
  faltantes.sort((a, b) => {
    if (a.estado === 'CRITICO' && b.estado !== 'CRITICO') return -1;
    if (a.estado !== 'CRITICO' && b.estado === 'CRITICO') return 1;
    return b.cantidadReponer - a.cantidadReponer;
  });

  const totalCostoEstimado = faltantes.reduce(
    (acc, curr) => acc + (curr.cantidadReponer > 0 ? curr.cantidadReponer * (curr.costoPromedio || 0) : 0),
    0
  );

  const totalCriticos = faltantes.filter((i) => i.estado === 'CRITICO').length;
  const totalBajos = faltantes.filter((i) => i.estado === 'CERCA_MINIMO').length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Insumo',
      'Categoría',
      'Base',
      'Stock Actual',
      'Unidad',
      'Stock Mínimo',
      'Stock Objetivo',
      'Cantidad a Reponer',
      'Costo Promedio',
      'Total Estimado',
      'Estado',
    ];

    const rows = faltantes.map((i) => [
      `"${i.idInsumo}"`,
      `"${i.insumo.replace(/"/g, '""')}"`,
      `"${i.categoria}"`,
      `"${i.provincia}"`,
      i.stockActual,
      `"${i.unidad}"`,
      i.stockMinimo,
      i.stockObjetivo,
      i.cantidadReponer,
      i.costoPromedio ? Math.round(i.costoPromedio) : 0,
      i.cantidadReponer > 0 ? Math.round(i.cantidadReponer * (i.costoPromedio || 0)) : 0,
      `"${i.estado}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Reporte_Faltantes_Autosol_${provinciaFiltro || 'Todas'}_${fecha}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fechaImpresion = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:block print:overflow-visible">
      {/* Reglas de impresión CSS para PDF y papel sin cortes extraños ni páginas vacías */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
          .signatures-area {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div
        id="print-section"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0 print:rounded-none"
      >
        {/* Modal Toolbar (Oculto al imprimir) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reporte de Faltantes y Reposición de Stock
              </h2>
              <p className="text-xs text-slate-500">
                Listado de insumos críticos o por debajo del stock objetivo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Descargar archivo CSV compatible con Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Imprimible */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-900 print:overflow-visible print:p-2">
          {/* Membrete Oficial Autosol */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
            <div>
              <div className="text-[10px] tracking-widest text-slate-500 font-bold mb-0.5">
                AUTOSOL JUJUY · TALLER & PAÑOL
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                ORDEN DE COMPRA & REPOSICIÓN DE INSUMOS
              </h1>
              <div className="flex gap-3 text-xs text-slate-600 mt-1">
                <span>
                  <strong>Base:</strong> {provinciaFiltro ? provinciaFiltro : 'Todas las Bases'}
                </span>
                <span>•</span>
                <span>
                  <strong>Emisión:</strong> {fechaImpresion}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500 font-medium">Prioridad Inmediata</div>
              <div className="text-base font-black text-red-600 font-mono">
                {totalCriticos} Críticos / {totalBajos} Bajos
              </div>
            </div>
          </div>

          {/* Resumen de Costo Estimado con Colores Suaves y Profesionales */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <div className="p-2.5 bg-red-50/90 border border-red-200 rounded-lg">
              <span className="text-red-700 font-bold block text-[10px] uppercase">
                Insumos en Quiebre / Crítico
              </span>
              <span className="text-base font-bold text-red-900 font-mono">
                {totalCriticos}
              </span>
            </div>
            <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg">
              <span className="text-amber-800 font-bold block text-[10px] uppercase">
                Insumos Cerca del Mínimo
              </span>
              <span className="text-base font-bold text-amber-900 font-mono">
                {totalBajos}
              </span>
            </div>
            <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg">
              <span className="text-slate-600 font-bold block text-[10px] uppercase">
                Inversión Estimada en Reposición
              </span>
              <span className="text-base font-bold text-slate-900 font-mono">
                $ {Math.round(totalCostoEstimado).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Tabla de Reposición */}
          {faltantes.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-emerald-200 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-900">
                ¡Inventario completo y suficiente!
              </p>
              <p className="text-xs text-emerald-700">
                No hay insumos por debajo del mínimo ni pendientes de reposición en este momento.
              </p>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] font-semibold uppercase">
                  <tr>
                    <th className="py-2 px-2.5">Código</th>
                    <th className="py-2 px-2.5">Insumo</th>
                    <th className="py-2 px-2.5">Categoría</th>
                    <th className="py-2 px-2.5 text-right">Actual</th>
                    <th className="py-2 px-2.5 text-right">Mínimo</th>
                    <th className="py-2 px-2.5 text-right">Objetivo</th>
                    <th className="py-2 px-2.5 text-right bg-slate-800 text-amber-300 font-bold">
                      A Pedir
                    </th>
                    <th className="py-2 px-2.5 text-right">Est. Unitario</th>
                    <th className="py-2 px-2.5 text-right">Subtotal</th>
                    <th className="py-2 px-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {faltantes.map((item) => {
                    const cantidadAPedir =
                      item.cantidadReponer > 0
                        ? item.cantidadReponer
                        : Math.max(0, item.stockObjetivo - item.stockActual);
                    const subtotal = cantidadAPedir * (item.costoPromedio || 0);
                    return (
                      <tr
                        key={item.idInsumo + '_' + item.provincia}
                        className={item.estado === 'CRITICO' ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}
                      >
                        <td className="py-1.5 px-2.5 text-slate-500 font-sans text-[10px]">
                          {item.idInsumo}
                        </td>
                        <td className="py-1.5 px-2.5 font-sans font-bold text-slate-900">
                          {item.insumo}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({item.provincia})
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 font-sans text-slate-600 text-[10px]">
                          {item.categoria}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                          {item.stockActual}{' '}
                          <span className="font-normal text-[9px] text-slate-500">
                            {item.unidad}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-slate-600">
                          {item.stockMinimo}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-slate-600">
                          {item.stockObjetivo}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold bg-amber-50/80 text-amber-950">
                          +{cantidadAPedir}{' '}
                          <span className="text-[9px] font-normal">{item.unidad}</span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-slate-600">
                          ${Math.round(item.costoPromedio || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                          ${Math.round(subtotal).toLocaleString('es-AR')}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-sans">
                          {item.estado === 'CRITICO' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">
                              CRÍTICO
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-800">
                              BAJO
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={6} className="py-2 px-2.5 text-right font-sans text-slate-700 text-xs">
                      TOTAL ESTIMADO ORDEN DE REPOSICIÓN:
                    </td>
                    <td
                      colSpan={4}
                      className="py-2 px-2.5 text-right font-mono text-sm text-slate-950 font-black"
                    >
                      $ {Math.round(totalCostoEstimado).toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Firmas de Autorización para Compras / Pañol */}
          <div className="signatures-area mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-dashed border-slate-400 w-44 mx-auto mb-1.5"></div>
              <span>Responsable de Pañol / Stock</span>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 w-44 mx-auto mb-1.5"></div>
              <span>Autorización Gerencia / Compras</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
