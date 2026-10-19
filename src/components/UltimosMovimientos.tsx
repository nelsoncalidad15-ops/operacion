import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  Download,
  FileText,
  User,
  Layers,
  Calendar,
  X,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Package,
} from 'lucide-react';
import { MovimientoHistorial, Colaborador } from '../types';
import { PROVINCIAS, SECTORES } from '../data/config';
import { api } from '../services/api';
import { ReporteHistorialModal } from './ReporteHistorialModal';

export const UltimosMovimientos: React.FC<{ provinciaFija?: string }> = ({ provinciaFija }) => {
  const [movimientos, setMovimientos] = useState<MovimientoHistorial[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>(provinciaFija || '');

  // Filtros interactivos
  const [filtroSector, setFiltroSector] = useState<string>('');
  const [filtroColaborador, setFiltroColaborador] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal de reporte formal imprimible
  const [showReporteModal, setShowReporteModal] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [movRes, colabRes] = await Promise.all([
        api.getUltimosMovimientos(100000),
        api.getColaboradores(provinciaFija || provinciaFiltro || undefined),
      ]);

      if (movRes.ok && movRes.data) {
        setMovimientos(movRes.data);
      }
      if (colabRes.ok && colabRes.data) {
        setColaboradores(colabRes.data);
      }
    } catch (err: any) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [provinciaFiltro]);

  // Lista dinámica de Sectores disponibles
  const sectoresDisponibles = useMemo(() => {
    const set = new Set<string>(SECTORES);
    movimientos.forEach((m) => {
      const sec = m.sector || m.sectorOProveedor;
      if (sec && !sec.includes('(')) set.add(sec.trim());
    });
    return Array.from(set).sort();
  }, [movimientos]);

  // Lista dinámica de Colaboradores disponibles (técnicos / lavadores)
  const colaboradoresDisponibles = useMemo(() => {
    const map = new Map<string, string>(); // nombre -> sector
    // Agregar desde base de datos
    colaboradores.forEach((c) => {
      if (c.nombre) map.set(c.nombre.trim(), c.sector || '');
    });
    // Agregar desde historial de movimientos
    movimientos.forEach((m) => {
      const raw = m.solicitante || m.persona.replace(/\s*\(Aut:.*\)$/i, '').trim();
      if (raw && !map.has(raw)) {
        map.set(raw, m.sector || m.sectorOProveedor || '');
      }
    });

    return Array.from(map.entries())
      .map(([nombre, sector]) => ({ nombre, sector }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [colaboradores, movimientos]);

  // Filtrado reactivo de movimientos
  const movimientosFiltrados = useMemo(() => {
    const ahora = new Date();
    const hoyStr = ahora.toISOString().slice(0, 10);
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const esteMesStr = hoyStr.slice(0, 7);

    const mesAnteriorDate = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const mesAnteriorStr = `${mesAnteriorDate.getFullYear()}-${(mesAnteriorDate.getMonth() + 1).toString().padStart(2, '0')}`;

    return movimientos.filter((m) => {
      // Filtro provincia
      const baseActual = provinciaFija || provinciaFiltro;
      if (baseActual && m.provincia.toLowerCase() !== baseActual.toLowerCase()) {
        return false;
      }

      // Filtro tipo (SALIDA / INGRESO)
      if (filtroTipo && m.tipo !== filtroTipo) {
        return false;
      }

      // Filtro Sector / Área
      const sectorMov = (m.sector || m.sectorOProveedor || '').toLowerCase();
      if (filtroSector && !sectorMov.includes(filtroSector.toLowerCase())) {
        return false;
      }

      // Filtro Colaborador / Solicitante
      const personaMov = (m.solicitante || m.persona).toLowerCase();
      if (filtroColaborador && !personaMov.includes(filtroColaborador.toLowerCase())) {
        return false;
      }

      // Filtro de Fecha / Período
      const fechaCorta = (m.fechaHora || '').slice(0, 10);
      if (filtroPeriodo === 'hoy' && fechaCorta !== hoyStr) {
        return false;
      }
      if (filtroPeriodo === '7dias' && fechaCorta < hace7Dias) {
        return false;
      }
      if (filtroPeriodo === 'este_mes' && !fechaCorta.startsWith(esteMesStr)) {
        return false;
      }
      if (filtroPeriodo === 'mes_anterior' && !fechaCorta.startsWith(mesAnteriorStr)) {
        return false;
      }

      // Búsqueda por texto (insumo, persona, sector, id)
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchInsumo = m.insumo.toLowerCase().includes(q);
        const matchPersona = m.persona.toLowerCase().includes(q);
        const matchSector = (m.sectorOProveedor || '').toLowerCase().includes(q);
        const matchId = m.id.toLowerCase().includes(q);
        if (!matchInsumo && !matchPersona && !matchSector && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [
    movimientos,
    provinciaFija,
    provinciaFiltro,
    filtroTipo,
    filtroSector,
    filtroColaborador,
    filtroPeriodo,
    busqueda,
  ]);

  // Resumen numérico de los resultados filtrados
  const metrics = useMemo(() => {
    const totalCantidad = movimientosFiltrados.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
    const totalMonto = movimientosFiltrados.reduce((acc, curr) => acc + (curr.monto || 0), 0);
    const countSalidas = movimientosFiltrados.filter((m) => m.tipo === 'SALIDA').length;
    const countIngresos = movimientosFiltrados.filter((m) => m.tipo === 'INGRESO').length;

    return {
      totalCantidad,
      totalMonto,
      countSalidas,
      countIngresos,
      total: movimientosFiltrados.length,
    };
  }, [movimientosFiltrados]);

  const hayFiltrosActivos = Boolean(
    filtroSector || filtroColaborador || filtroTipo || filtroPeriodo !== 'todos' || busqueda.trim()
  );

  const handleLimpiarFiltros = () => {
    setFiltroSector('');
    setFiltroColaborador('');
    setFiltroTipo('');
    setFiltroPeriodo('todos');
    setBusqueda('');
  };

  const handleDescargarExcel = () => {
    const headers = [
      'Fecha/Hora',
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

    const rows = movimientosFiltrados.map((m) => [
      `"${m.fechaHora}"`,
      `"${m.tipo}"`,
      `"${m.insumo.replace(/"/g, '""')}"`,
      m.cantidad,
      `"${m.unidad}"`,
      `"${(m.solicitante || m.persona).replace(/"/g, '""')}"`,
      `"${(m.sector || m.sectorOProveedor).replace(/"/g, '""')}"`,
      `"${m.provincia}"`,
      `"${m.estado}"`,
      Math.round(m.monto || 0),
    ]);

    const metadata = [
      ['HISTORIAL DE MOVIMIENTOS - AUTOSOL'],
      [`Fecha de descarga: ${new Date().toLocaleString('es-AR')}`],
      [`Base: ${provinciaFija || provinciaFiltro || 'Todas'}`],
      [`Área: ${filtroSector || 'Todas'}`],
      [`Colaborador: ${filtroColaborador || 'Todos'}`],
      [`Tipo: ${filtroTipo || 'Todos'}`],
      [`Período: ${filtroPeriodo}`],
      [`Total Registros: ${metrics.total}`],
      [`Total Monto: $ ${Math.round(metrics.totalMonto)}`],
      [],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        ...metadata.map((r) => r.join(';')),
        headers.join(';'),
        ...rows.map((r) => r.join(';')),
        ['TOTALES', '', '', metrics.totalCantidad, '', '', '', '', '', Math.round(metrics.totalMonto)].join(';'),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    const secTag = filtroSector ? `_${filtroSector}` : '';
    const colabTag = filtroColaborador ? `_${filtroColaborador.replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `Movimientos_Autosol${secTag}${colabTag}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-5">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Historial de Movimientos
          </h1>
          <p className="text-xs text-slate-500">
            Registro de ingresos, compras y salidas con filtros por colaborador, área y descarga de reportes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botones de Exportación y Reporte */}
          <button
            onClick={handleDescargarExcel}
            disabled={movimientosFiltrados.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Descargar tabla filtrada en formato Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bajar Excel</span>
          </button>

          <button
            onClick={() => setShowReporteModal(true)}
            disabled={movimientosFiltrados.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Generar vista previa formal e imprimir reporte en PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-300" />
            <span>Emitir Reporte PDF</span>
          </button>

          {/* Selector de Base / Provincia */}
          {!provinciaFija && (
            <select
              value={provinciaFiltro}
              onChange={(e) => setProvinciaFiltro(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none shadow-2xs font-medium"
            >
              <option value="">Todas las bases</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadData}
            title="Actualizar datos"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros Interactiva */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* 1. Búsqueda por texto libre */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar insumo, operario..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Filtro de Área / Sector */}
          <div>
            <select
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-700"
            >
              <option value="">Todas las Áreas</option>
              {sectoresDisponibles.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filtro de Colaborador / Técnico / Lavador */}
          <div>
            <select
              value={filtroColaborador}
              onChange={(e) => setFiltroColaborador(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-700"
            >
              <option value="">Todos los Colaboradores</option>
              {colaboradoresDisponibles.map((colab) => (
                <option key={colab.nombre} value={colab.nombre}>
                  {colab.nombre} {colab.sector ? `(${colab.sector})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filtro de Tipo de Movimiento */}
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-700"
            >
              <option value="">Todos los tipos</option>
              <option value="SALIDA">Salidas (Retiros)</option>
              <option value="INGRESO">Ingresos (Compras)</option>
            </select>
          </div>

          {/* 5. Filtro de Período / Fecha */}
          <div>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-700"
            >
              <option value="todos">Todo el Historial</option>
              <option value="hoy">Hoy</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="este_mes">Este mes</option>
              <option value="mes_anterior">Mes anterior</option>
            </select>
          </div>
        </div>

        {/* Barra de Resumen / KPIs de Filtro */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            <span className="font-medium">
              Resultados: <strong className="text-slate-900 font-mono">{metrics.total}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Retiros / Salidas: <strong className="text-amber-800 font-mono">{metrics.countSalidas}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Ingresos: <strong className="text-emerald-700 font-mono">{metrics.countIngresos}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Monto total:{' '}
              <strong className="text-slate-900 font-mono font-bold">
                ${Math.round(metrics.totalMonto).toLocaleString('es-AR')}
              </strong>
            </span>
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={handleLimpiarFiltros}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Insumo</th>
                <th className="py-2.5 px-3 text-right">Cantidad</th>
                <th className="py-2.5 px-3">Operario / Solicitante</th>
                <th className="py-2.5 px-3">Área / Sector</th>
                <th className="py-2.5 px-3">Base</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-slate-400" />
                    Cargando historial de movimientos...
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No se encontraron movimientos.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {hayFiltrosActivos
                        ? 'Probá cambiando o limpiando los filtros seleccionados.'
                        : 'No hay registros en la base de datos.'}
                    </p>
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((m, idx) => {
                  const solicitanteLimpio =
                    m.solicitante || m.persona.replace(/\s*\(Aut:.*\)$/i, '').trim();
                  const autorizador = m.persona.match(/\(Aut:\s*(.*?)\)/i)?.[1];
                  const sectorLimpio = m.sector || m.sectorOProveedor;

                  return (
                    <tr
                      key={`${m.id}_${idx}`}
                      className="hover:bg-slate-50/70 font-mono text-[11px] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {m.fechaHora}
                      </td>
                      <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                        {m.tipo === 'INGRESO' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px] border border-emerald-200">
                            <ArrowDownRight className="w-3 h-3" />
                            Ingreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium text-[10px] border border-amber-200">
                            <ArrowUpRight className="w-3 h-3" />
                            Salida
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {m.insumo}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {m.cantidad}{' '}
                        <span className="font-normal text-slate-400 text-[10px] font-sans">
                          {m.unidad}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-800">
                        <span className="font-medium">{solicitanteLimpio}</span>
                        {autorizador && (
                          <span className="block text-[10px] text-slate-400 font-sans">
                            Aut: {autorizador}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700">
                          {sectorLimpio}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500">
                        {m.provincia}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                        ${Math.round(m.monto || 0).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla con totalizadores */}
        {movimientosFiltrados.length > 0 && (
          <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
            <span>
              Mostrando <strong className="font-mono text-slate-900">{movimientosFiltrados.length}</strong> movimientos
            </span>
            <div className="flex items-center gap-4">
              <span>
                Total insumos entregados / movilizados:{' '}
                <strong className="font-mono text-slate-900 font-bold">{metrics.totalCantidad}</strong>
              </span>
              <span>
                Monto valorizado:{' '}
                <strong className="font-mono text-slate-950 font-black">
                  ${Math.round(metrics.totalMonto).toLocaleString('es-AR')}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal para emitir o imprimir el Reporte Formal */}
      <ReporteHistorialModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
        movimientos={movimientosFiltrados}
        filtros={{
          provincia: provinciaFija || provinciaFiltro,
          sector: filtroSector,
          colaborador: filtroColaborador,
          tipo: filtroTipo,
          periodo: filtroPeriodo,
          busqueda,
        }}
      />
    </div>
  );
};
