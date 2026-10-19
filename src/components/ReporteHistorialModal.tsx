import React from 'react';
import { Printer, X, Download, FileSpreadsheet, User, Layers, Calendar, DollarSign } from 'lucide-react';
import { MovimientoHistorial } from '../types';

interface ReporteHistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimientos: MovimientoHistorial[];
  filtros: {
    provincia?: string;
    sector: string;
    colaborador: string;
    tipo: string;
    mes: string;
    mesLabel?: string;
    fecha?: string;
    busqueda: string;
  };
}

export const formatFechaHora = (fechaHoraStr: string) => {
  if (!fechaHoraStr) return { mes: '-', fecha: '-', hora: '-' };
  const clean = fechaHoraStr.replace('T', ' ');
  const parts = clean.split(' ');
  const datePart = parts[0] || '';
  const timePart = parts[1] || '';

  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return { mes: '-', fecha: fechaHoraStr, hora: '' };
  }

  const anio = match[1];
  const mesNum = parseInt(match[2], 10);
  const dia = match[3];

  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const mesNombre = mesesNombres[mesNum - 1] || match[2];

  const fechaFormateada = `${dia}/${match[2]}/${anio}`;
  const horaFormateada = timePart ? timePart.slice(0, 5) : '';

  return {
    mes: `${mesNombre} ${anio}`,
    mesCorto: `${mesNombre.slice(0, 3)} ${anio}`,
    fecha: fechaFormateada,
    hora: horaFormateada ? `${horaFormateada} hs` : '',
    rawMes: `${anio}-${match[2]}`,
    rawFecha: `${anio}-${match[2]}-${dia}`,
  };
};

export const ReporteHistorialModal: React.FC<ReporteHistorialModalProps> = ({
  isOpen,
  onClose,
  movimientos,
  filtros,
}) => {
  if (!isOpen) return null;

  const totalMonto = movimientos.reduce((acc, m) => acc + (m.monto || 0), 0);
  const salidasCount = movimientos.filter((m) => m.tipo === 'SALIDA').length;
  const ingresosCount = movimientos.filter((m) => m.tipo === 'INGRESO').length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Mes',
      'Fecha',
      'Hora',
      'Tipo',
      'Insumo',
      'Cantidad',
      'Unidad',
      'Operario / Solicitante',
      'Área / Sector',
      'Base',
      'Estado',
      'Monto ($)',
    ];

    const rows = movimientos.map((m) => {
      const fh = formatFechaHora(m.fechaHora);
      return [
        `"${fh.mes}"`,
        `"${fh.fecha}"`,
        `"${fh.hora}"`,
        `"${m.tipo}"`,
        `"${m.insumo.replace(/"/g, '""')}"`,
        m.cantidad,
        `"${m.unidad}"`,
        `"${(m.solicitante || m.persona).replace(/"/g, '""')}"`,
        `"${(m.sector || m.sectorOProveedor).replace(/"/g, '""')}"`,
        `"${m.provincia}"`,
        `"${m.estado}"`,
        Math.round(m.monto || 0),
      ];
    });

    const metadata = [
      ['REPORTE DE MOVIMIENTOS E HISTORIAL - AUTOSOL'],
      [`Fecha de Emisión: ${new Date().toLocaleString('es-AR')}`],
      [`Filtro Base: ${filtros.provincia || 'Todas'}`],
      [`Filtro Área: ${filtros.sector || 'Todas'}`],
      [`Filtro Colaborador: ${filtros.colaborador || 'Todos'}`],
      [`Filtro Mes: ${filtros.mesLabel || filtros.mes || 'Todos los meses'}`],
      [`Filtro Fecha puntual: ${filtros.fecha || 'Todas'}`],
      [`Filtro Tipo: ${filtros.tipo || 'Todos'}`],
      [`Registros: ${movimientos.length}`],
      [`Total Monto: $ ${Math.round(totalMonto)}`],
      [],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        ...metadata.map((r) => r.join(';')),
        headers.join(';'),
        ...rows.map((r) => r.join(';')),
        ['TOTALES', '', '', '', '', '', '', '', '', '', '', Math.round(totalMonto)].join(';'),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    const mesPart = filtros.mes ? `_${filtros.mes}` : '';
    const sectorPart = filtros.sector ? `_${filtros.sector}` : '';
    const colabPart = filtros.colaborador ? `_${filtros.colaborador.replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `Reporte_Movimientos_Autosol${mesPart}${sectorPart}${colabPart}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCleanPersona = (m: MovimientoHistorial) => {
    return m.solicitante || m.persona.replace(/\s*\(Aut:.*\)$/i, '').trim();
  };

  const getCleanSector = (m: MovimientoHistorial) => {
    return m.sector || m.sectorOProveedor;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          #print-historial-section, #print-historial-section * {
            visibility: visible;
          }
          #print-historial-section {
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
        id="print-historial-section"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0 print:rounded-none"
      >
        {/* Barra superior (oculta al imprimir) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reporte de Movimientos de Insumos
              </h2>
              <p className="text-xs text-slate-500">
                Organizado por mes, fecha y hora · Detallado por colaborador y área
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Descargar archivo Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido del Documento para Impresión y Pantalla */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:overflow-visible print:p-0">
          {/* Membrete Oficial */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-950 font-sans">
                  AUTOSOL
                </span>
                <span className="text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Control de Insumos
                </span>
              </div>
              <h1 className="text-sm font-bold text-slate-800 mt-1">
                REPORTE AUDITABLE DE MOVIMIENTOS
              </h1>
              <p className="text-[11px] text-slate-500 font-mono">
                Emitido el {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="text-right text-xs">
              <span className="font-semibold text-slate-700">Base:</span>{' '}
              <span className="font-bold text-slate-900">
                {filtros.provincia || 'Todas las bases'}
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                {movimientos.length} movimiento{movimientos.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* Tarjetas de Resumen y Filtros Activos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Mes / Período</span>
              <span className="font-bold text-slate-800">
                {filtros.mesLabel || filtros.mes || (filtros.fecha ? `Fecha: ${filtros.fecha}` : 'Todos los meses')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Área / Sector</span>
              <span className="font-bold text-slate-800">
                {filtros.sector ? filtros.sector : 'Todas las áreas'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Colaborador</span>
              <span className="font-bold text-slate-800 truncate block">
                {filtros.colaborador ? filtros.colaborador : 'Todos los colaboradores'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Monto Total ($)</span>
              <span className="font-mono font-bold text-slate-950 text-sm">
                $ {Math.round(totalMonto).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Tabla de Movimientos */}
          {movimientos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No hay movimientos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Mes</th>
                    <th className="py-2 px-3">Fecha y Hora</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Insumo</th>
                    <th className="py-2 px-3 text-right">Cantidad</th>
                    <th className="py-2 px-3">Operario / Solicitante</th>
                    <th className="py-2 px-3">Área</th>
                    <th className="py-2 px-3 text-right">Monto ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {movimientos.map((m, idx) => {
                    const fh = formatFechaHora(m.fechaHora);
                    return (
                      <tr key={`${m.id}_${idx}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-sans text-slate-700 whitespace-nowrap font-medium">
                          {fh.mes}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{fh.fecha}</span>{' '}
                          <span className="text-[10px] text-slate-400 font-normal">{fh.hora}</span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {m.tipo === 'INGRESO' ? (
                            <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              INGRESO
                            </span>
                          ) : (
                            <span className="text-amber-800 font-medium text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              SALIDA
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">
                          {m.insumo}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {m.cantidad.toLocaleString('es-AR')}{' '}
                          <span className="font-normal text-[10px] text-slate-400 font-sans">
                            {m.unidad}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700">
                          {getCleanPersona(m)}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">
                          {getCleanSector(m)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ${Math.round(m.monto || 0).toLocaleString('es-AR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 font-sans text-slate-700 text-xs">
                      TOTAL ({movimientos.length} movimientos: {salidasCount} salidas, {ingresosCount} ingresos):
                    </td>
                    <td colSpan={3}></td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-950 font-black">
                      $ {Math.round(totalMonto).toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Firmas de Autorización para Compras / Pañol */}
          <div className="signatures-area mt-10 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto mb-1.5"></div>
              <span className="font-semibold text-slate-700">Responsable de Pañol / Stock</span>
              <span className="block text-[10px] text-slate-400">Control físico y entregas</span>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto mb-1.5"></div>
              <span className="font-semibold text-slate-700">Jefe de Taller / Gerencia</span>
              <span className="block text-[10px] text-slate-400">Auditoría y control de consumos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
