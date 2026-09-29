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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Estilos para impresión en PDF/papel */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="print-section"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0 print:rounded-none"
      >
        {/* Modal Toolbar (Oculto al imprimir) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reporte de Faltantes y Reposición de Stock
              </h2>
              <p className="text-xs text-slate-500">
                Lista de insumos en estado crítico o por debajo de stock objetivo
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
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
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

        {/* Contenido Imprimible / Visible */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-900 print:overflow-visible print:p-0">
          {/* Membrete Oficial Autosol */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-end">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                AUTOSOL JUJUY · TALLER & PAÑOL
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                ORDEN DE COMPRA & REPOSICIÓN DE INSUMOS
              </h1>
              <div className="flex gap-4 text-xs text-slate-600 mt-1">
                <span>
                  <strong>Base:</strong> {provinciaFiltro ? provinciaFiltro : 'Todas las Bases'}
                </span>
                <span>•</span>
                <span>
                  <strong>Fecha de emisión:</strong> {fechaImpresion}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Prioridad Inmediata</div>
              <div className="text-lg font-black text-red-600 font-mono">
                {totalCriticos} Críticos / {totalBajos} Bajos
              </div>
            </div>
          </div>

          {/* Resumen de Costo Estimado */}
          <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-red-700 font-semibold block text-[11px] uppercase">
                Insumos en Quiebre / Crítico
              </span>
              <span className="text-lg font-bold text-red-900 font-mono">
                {totalCriticos}
              </span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-800 font-semibold block text-[11px] uppercase">
                Insumos Cerca del Mínimo
              </span>
              <span className="text-lg font-bold text-amber-900 font-mono">
                {totalBajos}
              </span>
            </div>
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
              <span className="text-slate-600 font-semibold block text-[11px] uppercase">
                Inversión Estimada en Reposición
              </span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                $ {Math.round(totalCostoEstimado).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Tabla de Reposición */}
          {faltantes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-emerald-200 bg-emerald-50 rounded-xl">
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
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[11px] font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Insumo</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Stock Actual</th>
                    <th className="py-2.5 px-3 text-right">Mínimo</th>
                    <th className="py-2.5 px-3 text-right">Objetivo</th>
                    <th className="py-2.5 px-3 text-right bg-slate-800 text-amber-300 font-bold">
                      A Pedir
                    </th>
                    <th className="py-2.5 px-3 text-right">Est. Unitario</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {faltantes.map((item) => {
                    const subtotal = (item.cantidadReponer || 0) * (item.costoPromedio || 0);
                    return (
                      <tr
                        key={item.idInsumo + '_' + item.provincia}
                        className={item.estado === 'CRITICO' ? 'bg-red-50/50' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2 px-3 text-slate-500 font-sans">{item.idInsumo}</td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900">
                          {item.insumo}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Base: {item.provincia}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">{item.categoria}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {item.stockActual}{' '}
                          <span className="font-normal text-[10px] text-slate-500">
                            {item.unidad}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {item.stockMinimo}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {item.stockObjetivo}
                        </td>
                        <td className="py-2 px-3 text-right font-bold bg-amber-50/60 text-amber-900">
                          +{item.cantidadReponer > 0 ? item.cantidadReponer : (item.stockObjetivo - item.stockActual > 0 ? item.stockObjetivo - item.stockActual : 0)}{' '}
                          <span className="text-[10px] font-normal">{item.unidad}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          ${Math.round(item.costoPromedio || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ${Math.round(subtotal).toLocaleString('es-AR')}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          {item.estado === 'CRITICO' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                              CRÍTICO
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
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
                    <td colSpan={6} className="py-2.5 px-3 text-right font-sans text-slate-700">
                      TOTAL ESTIMADO DE LA ORDEN DE REPOSICIÓN:
                    </td>
                    <td
                      colSpan={4}
                      className="py-2.5 px-3 text-right font-mono text-sm text-slate-950 font-black"
                    >
                      $ {Math.round(totalCostoEstimado).toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Firmas de Autorización para Compras / Pañol */}
          <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto mb-2"></div>
              <span>Responsable de Pañol / Stock</span>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto mb-2"></div>
              <span>Autorización Gerencia / Compras</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
