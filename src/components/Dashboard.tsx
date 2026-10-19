import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  FileText,
  TrendingDown,
  Package,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { StockItem, MovimientoHistorial, AuthSession, PedidoEnCamino } from '../types';
import { PROVINCIAS, SECTORES } from '../data/config';
import { api } from '../services/api';
import { ReporteFaltantesModal } from './ReporteFaltantesModal';
import { ModalRecepcionPedido } from './ModalRecepcionPedido';

export const Dashboard: React.FC<{ session: AuthSession }> = ({ session }) => {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoHistorial[]>([]);
  const [pedidosEnCamino, setPedidosEnCamino] = useState<PedidoEnCamino[]>([]);
  const [recepcionModalItem, setRecepcionModalItem] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>(session.provincia || '');
  const [showReporteModal, setShowReporteModal] = useState<boolean>(false);

  // Filtros para el análisis de consumo por colaborador
  const [colabSectorFiltro, setColabSectorFiltro] = useState<string>('');
  const [colabPeriodoFiltro, setColabPeriodoFiltro] = useState<string>('todos');
  const [colabOrden, setColabOrden] = useState<'mas' | 'menos'>('mas');

  const loadData = async () => {
    setIsLoading(true);
    try {
      setLoadError(null);
      const [stockRes, movimientosRes] = await Promise.all([
        api.getStock(session.provincia || provinciaFiltro || undefined),
        api.getUltimosMovimientos(100000),
      ]);
      if (!stockRes.ok || !movimientosRes.ok) {
        throw new Error(stockRes.message || movimientosRes.message || 'No se pudieron cargar los datos.');
      }
      setStockList(stockRes.data || []);
      setMovimientos((movimientosRes.data || []).filter((m) =>
        !(session.provincia || provinciaFiltro) || m.provincia.toLowerCase() === (session.provincia || provinciaFiltro).toLowerCase()
      ));
      setPedidosEnCamino(api.getPedidosEnCamino(session.provincia || provinciaFiltro || undefined));
    } catch (err: any) {
      console.error('Error cargando dashboard:', err);
      setLoadError(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarcarPedido = (item: { id: string; insumo: string; provincia: string; unidad: string; deficit: number }) => {
    api.marcarPedidoEnCamino({
      idInsumo: item.id,
      insumo: item.insumo,
      provincia: item.provincia,
      unidad: item.unidad,
      cantidadPedida: item.deficit,
      responsable: session.responsableNombre,
    });
    setPedidosEnCamino(api.getPedidosEnCamino(session.provincia || provinciaFiltro || undefined));
  };

  const handleCancelarPedido = (idInsumo: string, provincia: string) => {
    api.quitarPedidoEnCamino(idInsumo, provincia);
    setPedidosEnCamino(api.getPedidosEnCamino(session.provincia || provinciaFiltro || undefined));
  };

  useEffect(() => {
    loadData();
  }, [provinciaFiltro]);

  const handleLimpiarPrueba = async () => {
    if (!window.confirm('¿Deseas purgar las compras y salidas de prueba ficticias para arrancar desde cero con las operaciones reales? (No borra el inventario de Autosol)')) {
      return;
    }
    setIsCleaning(true);
    try {
      await api.limpiarMovimientosDePrueba(session.token);
      await loadData();
    } catch (e) {
      console.error('Error limpiando datos de prueba:', e);
    } finally {
      setIsCleaning(false);
    }
  };

  const metrics = useMemo(() => {
    const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO' && /(?:^Compra$|\(Compra\)\s*$)/i.test(m.sectorOProveedor));
    const salidas = movimientos.filter((m) => m.tipo === 'SALIDA');
    const totalComprasMonto = ingresos.reduce((acc, curr) => acc + (curr.monto || 0), 0);
    const salidasValidas = salidas.filter((s) => s.estado === 'AUTORIZADO' || s.estado === 'AUTORIZADO PARCIAL');

    const totalSalidasMonto = salidasValidas.reduce((acc, curr) => acc + (curr.monto || 0), 0);
    const valorStockActual = stockList.reduce((acc, curr) => acc + (curr.valorStock || 0), 0);

    const totalSolicitado = salidas.reduce((acc, curr) => acc + (curr.solicitado || 0), 0);
    const totalAutorizado = salidasValidas.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
    const tasaAprobacion = totalSolicitado > 0 ? Math.round((totalAutorizado / totalSolicitado) * 100) : 100;

    // Conteo de Estados de Stock (Salud del inventario)
    const criticos = stockList.filter((s) => s.estado === 'CRITICO');
    const bajos = stockList.filter((s) => s.estado === 'CERCA_MINIMO');
    const suficientes = stockList.filter((s) => s.estado === 'SUFICIENTE');
    const totalItems = stockList.length || 1;

    const porcCritico = Math.round((criticos.length / totalItems) * 100);
    const porcBajo = Math.round((bajos.length / totalItems) * 100);
    const porcSuficiente = 100 - porcCritico - porcBajo;

    // Cálculo del Costo Total Estimado para Reposición
    const costoReposicionTotal = stockList.reduce(
      (acc, curr) => acc + (curr.cantidadReponer > 0 ? curr.cantidadReponer * (curr.costoPromedio || 0) : 0),
      0
    );

    // Top Insumos con Mayor Necesidad de Reposición (Déficit urgente)
    const topFaltantes = [...stockList]
      .filter((s) => s.cantidadReponer > 0 || s.estado === 'CRITICO' || s.estado === 'CERCA_MINIMO')
      .map((s) => {
        const deficit = s.cantidadReponer > 0 ? s.cantidadReponer : Math.max(0, s.stockObjetivo - s.stockActual);
        const pedido = pedidosEnCamino.find(
          (p) => p.idInsumo === s.idInsumo && p.provincia.toLowerCase() === s.provincia.toLowerCase()
        );
        return {
          id: s.idInsumo,
          insumo: s.insumo,
          provincia: s.provincia,
          stockActual: s.stockActual,
          stockObjetivo: s.stockObjetivo,
          unidad: s.unidad,
          deficit,
          estado: s.estado,
          costoReponer: deficit * (s.costoPromedio || 0),
          costoPromedio: s.costoPromedio || 0,
          pedidoEnCamino: pedido || null,
        };
      })
      .sort((a, b) => {
        // Primero los que NO fueron pedidos para que el usuario sepa qué falta ordenar
        if (!a.pedidoEnCamino && b.pedidoEnCamino) return -1;
        if (a.pedidoEnCamino && !b.pedidoEnCamino) return 1;
        return b.deficit - a.deficit;
      })
      .slice(0, 6);

    const criticosPendientes = criticos.filter(
      (c) => !pedidosEnCamino.some((p) => p.idInsumo === c.idInsumo && p.provincia.toLowerCase() === c.provincia.toLowerCase())
    ).length;
    const criticosEnCamino = criticos.length - criticosPendientes;
    const totalEnCamino = pedidosEnCamino.length;

    // Insumos más demandados (Salidas generales)
    const insumoMap = new Map<string, { nombre: string; cantidad: number; unidad?: string }>();
    for (const s of salidasValidas) {
      const key = `${s.provincia}:${s.idInsumo || s.insumo}`;
      const existing = insumoMap.get(key) || { nombre: s.insumo, cantidad: 0, unidad: s.unidad };
      existing.cantidad += s.cantidad;
      insumoMap.set(key, existing);
    }
    const topInsumos = Array.from(insumoMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Consumo por sector
    const sectorMap = new Map<string, number>();
    for (const s of salidasValidas) {
      const sec = s.sectorOProveedor || 'Otros';
      sectorMap.set(sec, (sectorMap.get(sec) || 0) + (s.monto || 0));
    }
    const porSector = Array.from(sectorMap.entries())
      .map(([sector, monto]) => ({ sector, monto }))
      .sort((a, b) => b.monto - a.monto);

    const maxSectorMonto = porSector.length > 0 ? Math.max(...porSector.map((s) => s.monto)) : 1;

    // Distribución de Valor por Categoría de Insumos
    const catMap = new Map<string, number>();
    for (const item of stockList) {
      const cat = item.categoria || 'Sin categoría';
      catMap.set(cat, (catMap.get(cat) || 0) + (item.valorStock || 0));
    }
    const porCategoria = Array.from(catMap.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);

    return {
      valorStockActual,
      totalSalidasMonto,
      totalComprasMonto,
      comprasCount: ingresos.length,
      tasaAprobacion,
      criticosCount: criticos.length,
      criticosPendientes,
      criticosEnCamino,
      totalEnCamino,
      bajosCount: bajos.length,
      suficientesCount: suficientes.length,
      porcCritico,
      porcBajo,
      porcSuficiente,
      costoReposicionTotal,
      topFaltantes,
      topInsumos,
      porSector,
      maxSectorMonto,
      porCategoria,
    };
  }, [stockList, movimientos, pedidosEnCamino]);

  const consumoColaboradores = useMemo(() => {
    const ahora = new Date();
    const hoyStr = ahora.toISOString().slice(0, 10);
    const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const esteMesStr = hoyStr.slice(0, 7);

    // Filtrar salidas válidas para el análisis
    const salidasValidas = movimientos.filter((m) => {
      if (m.tipo !== 'SALIDA') return false;
      if (m.estado !== 'AUTORIZADO' && m.estado !== 'AUTORIZADO PARCIAL') return false;

      // Filtro de período
      const fechaCorta = (m.fechaHora || '').slice(0, 10);
      if (colabPeriodoFiltro === 'este_mes' && !fechaCorta.startsWith(esteMesStr)) return false;
      if (colabPeriodoFiltro === '30dias' && fechaCorta < hace30Dias) return false;

      // Filtro de sector
      const sectorMov = (m.sector || m.sectorOProveedor || '').toLowerCase();
      if (colabSectorFiltro && !sectorMov.includes(colabSectorFiltro.toLowerCase())) return false;

      return true;
    });

    const colabMap = new Map<
      string,
      {
        nombre: string;
        sector: string;
        montoTotal: number;
        retirosCount: number;
        insumosMap: Map<string, { cantidad: number; unidad: string }>;
      }
    >();

    for (const s of salidasValidas) {
      const nombre = (s.solicitante || s.persona.replace(/\s*\(Aut:.*\)$/i, '')).trim();
      if (!nombre) continue;

      const sector = s.sector || s.sectorOProveedor || 'Taller';
      const existing = colabMap.get(nombre) || {
        nombre,
        sector,
        montoTotal: 0,
        retirosCount: 0,
        insumosMap: new Map<string, { cantidad: number; unidad: string }>(),
      };

      existing.montoTotal += s.monto || 0;
      existing.retirosCount += 1;

      const prev = existing.insumosMap.get(s.insumo) || { cantidad: 0, unidad: s.unidad || 'u' };
      prev.cantidad += s.cantidad || 0;
      if (s.unidad) prev.unidad = s.unidad;
      existing.insumosMap.set(s.insumo, prev);

      colabMap.set(nombre, existing);
    }

    const list = Array.from(colabMap.values()).map((c) => {
      let topInsumo = '';
      let topInsumoCant = 0;
      let topInsumoUnidad = '';
      for (const [ins, info] of c.insumosMap.entries()) {
        if (info.cantidad > topInsumoCant) {
          topInsumo = ins;
          topInsumoCant = info.cantidad;
          topInsumoUnidad = info.unidad;
        }
      }

      const uLimpia = (topInsumoUnidad || 'u').trim();
      const cantTexto = `${topInsumoCant.toLocaleString('es-AR')} ${uLimpia}`;

      return {
        nombre: c.nombre,
        sector: c.sector,
        montoTotal: c.montoTotal,
        retirosCount: c.retirosCount,
        topInsumo: topInsumo ? `${topInsumo} (${cantTexto})` : '',
      };
    });

    // Ordenamiento por consumo mayor o menor
    if (colabOrden === 'mas') {
      list.sort((a, b) => b.montoTotal - a.montoTotal || b.retirosCount - a.retirosCount);
    } else {
      list.sort((a, b) => a.montoTotal - b.montoTotal || a.retirosCount - b.retirosCount);
    }

    const maxMonto = list.length > 0 ? Math.max(...list.map((c) => c.montoTotal), 1) : 1;
    const totalConsumido = list.reduce((a, c) => a + c.montoTotal, 0);
    const totalPedidos = list.reduce((a, c) => a + c.retirosCount, 0);
    const promedioConsumo = list.length > 0 ? Math.round(totalConsumido / list.length) : 0;

    return {
      list,
      maxMonto,
      totalConsumido,
      totalPedidos,
      promedioConsumo,
      colaboradoresActivos: list.length,
    };
  }, [movimientos, colabSectorFiltro, colabPeriodoFiltro, colabOrden]);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {loadError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{loadError}</div>}
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Panel Operativo
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Reporte de Faltantes / Orden de Compra */}
          <button
            onClick={() => setShowReporteModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Generar e imprimir orden de reposición con lo que falta"
          >
            <FileText className="w-4 h-4" />
            <span>Reporte Faltantes (PDF)</span>
            {metrics.criticosCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-white text-red-700 rounded-full">
                {metrics.criticosCount}
              </span>
            )}
          </button>

          <select
            value={provinciaFiltro}
            onChange={(e) => setProvinciaFiltro(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none shadow-xs font-medium"
          >
            {!session.provincia && <option value="">Todas las bases</option>}
            {(session.provincia ? [session.provincia] : PROVINCIAS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {!session.provincia && <button
            onClick={handleLimpiarPrueba}
            disabled={isCleaning}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-white text-xs font-medium flex items-center gap-1 transition-colors shadow-xs"
            title="Limpiar compras y retiros de prueba para arrancar en cero"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isCleaning ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Iniciar Operación Limpia</span>
          </button>}
        </div>
      </div>

      {/* Alerta Destacada si hay Insumos Críticos Pendientes */}
      {metrics.criticosPendientes > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-950">
                {metrics.criticosPendientes} {metrics.criticosPendientes === 1 ? 'insumo crítico pendiente de pedir' : 'insumos críticos pendientes de pedir'} · Reponer: <strong>${Math.round(metrics.costoReposicionTotal).toLocaleString('es-AR')}</strong>
                {metrics.criticosEnCamino > 0 && (
                  <span className="ml-2 font-normal text-sky-800 text-[11px]">
                    (y {metrics.criticosEnCamino} ya pedidos en camino)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-red-700 mt-0.5">
                Podés hacer el pedido y marcarlo como &quot;Ya lo pedí&quot; para que el sistema sepa que está en viaje.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowReporteModal(true)}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline ml-2 shrink-0"
          >
            Ver orden de pedido &rarr;
          </button>
        </div>
      )}

      {/* Banner Informativo si todos los críticos ya están en camino */}
      {metrics.criticosPendientes === 0 && metrics.totalEnCamino > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-sky-950">
                Insumos pedidos al proveedor ({metrics.totalEnCamino} en camino hacia pañol)
              </div>
              <div className="text-[11px] text-sky-700 mt-0.5">
                Los pedidos ya fueron emitidos. Cuando llegue la mercadería, presiona &quot;Recibir&quot; para sumarla al stock.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowReporteModal(true)}
            className="text-xs font-semibold text-sky-800 hover:text-sky-950 underline ml-2 shrink-0"
          >
            Ver pedidos en curso &rarr;
          </button>
        </div>
      )}

      {/* Fila de Tarjetas KPIs Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Valor en Inventario</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            $ {Math.round(metrics.valorStockActual).toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stockList.length} artículos monitoreados
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Reposición Faltantes</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 font-mono mt-1">
            $ {Math.round(metrics.costoReposicionTotal).toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-red-600/80 font-medium mt-1">
            {metrics.criticosCount} en quiebre · {metrics.bajosCount} bajos
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Salidas a Taller</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            $ {Math.round(metrics.totalSalidasMonto).toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tasa de aprobación: {metrics.tasaAprobacion}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Compras Ingresadas</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            $ {Math.round(metrics.totalComprasMonto).toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.comprasCount} compras registradas
          </div>
        </div>
      </div>

      {/* Sección Gráfica 1: Semáforo de Salud de Inventario + Top Faltantes a Pedir */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfico Visual de Estado del Inventario (Barra de Salud) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Salud del Inventario
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Total: {stockList.length} ítems
              </span>
            </div>

            {/* Barra Segmentada de Salud de Stock */}
            <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex shadow-inner mb-4">
              <div
                style={{ width: `${metrics.porcSuficiente}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Suficiente / Óptimo: ${metrics.suficientesCount} (${metrics.porcSuficiente}%)`}
              />
              <div
                style={{ width: `${metrics.porcBajo}%` }}
                className="bg-amber-400 h-full transition-all duration-500"
                title={`Cerca del Mínimo: ${metrics.bajosCount} (${metrics.porcBajo}%)`}
              />
              <div
                style={{ width: `${metrics.porcCritico}%` }}
                className="bg-red-500 h-full transition-all duration-500"
                title={`Crítico / Sin Stock: ${metrics.criticosCount} (${metrics.porcCritico}%)`}
              />
            </div>

            {/* Leyenda y Conteo */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-semibold text-emerald-950">Stock Óptimo / Suficiente</span>
                </div>
                <div className="font-mono text-emerald-800 font-bold">
                  {metrics.suficientesCount}{' '}
                  <span className="text-[11px] font-normal text-emerald-600">
                    ({metrics.porcSuficiente}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="font-semibold text-amber-950">Próximos a Mínimo (Alerta)</span>
                </div>
                <div className="font-mono text-amber-900 font-bold">
                  {metrics.bajosCount}{' '}
                  <span className="text-[11px] font-normal text-amber-700">
                    ({metrics.porcBajo}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/60 border border-red-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span>
                  <span className="font-semibold text-red-950">Crítico / En Quiebre</span>
                </div>
                <div className="font-mono text-red-900 font-bold">
                  {metrics.criticosCount}{' '}
                  <span className="text-[11px] font-normal text-red-700">
                    ({metrics.porcCritico}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras: Lo que falta reponer con mayor urgencia */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Mayor Necesidad de Reposición (Qué falta)
              </h3>
              <button
                onClick={() => setShowReporteModal(true)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold"
              >
                Ver todos &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {metrics.topFaltantes.length === 0 ? (
                <div className="text-center py-8 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  Todo el stock se encuentra al nivel objetivo.
                </div>
              ) : (
                metrics.topFaltantes.map((item) => {
                  const maxVal = Math.max(item.stockObjetivo, item.stockActual, 1);
                  const actualPct = Math.min(100, Math.round((item.stockActual / maxVal) * 100));

                  return (
                    <div key={item.id + item.provincia} className="space-y-1.5 p-2 rounded-lg bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                          {item.insumo}
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                            ({item.provincia})
                          </span>
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5 font-mono">
                          <span className="text-[11px] text-slate-500 font-sans mr-1">
                            Stock: <strong>{item.stockActual}</strong> / Obj: {item.stockObjetivo}
                          </span>

                          {item.pedidoEnCamino ? (
                            <div className="flex items-center gap-1 font-sans">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-sky-600" />
                                En camino (+{item.pedidoEnCamino.cantidadPedida} {item.unidad})
                              </span>
                              <button
                                onClick={() => setRecepcionModalItem(item)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                title="Ingresar mercadería que llegó al pañol"
                              >
                                <PackageCheck className="w-3 h-3" />
                                Recibir
                              </button>
                              <button
                                onClick={() => handleCancelarPedido(item.id, item.provincia)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 text-[10px]"
                                title="Desmarcar / Cancelar pedido"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 font-sans">
                              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                                Faltan {item.deficit} {item.unidad}
                              </span>
                              <button
                                onClick={() => handleMarcarPedido(item)}
                                className="px-2 py-0.5 rounded border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 hover:text-sky-800 text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Marcar que ya hiciste el pedido al proveedor y está en camino"
                              >
                                <Truck className="w-3 h-3 text-sky-600" />
                                Ya lo pedí
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso de llenado de stock */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${actualPct}%` }}
                          className={`h-full transition-all duration-300 ${
                            item.pedidoEnCamino
                              ? 'bg-sky-500'
                              : item.estado === 'CRITICO'
                              ? 'bg-red-500'
                              : 'bg-amber-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-600">
            <span>Costo para nivelar top 5:</span>
            <span className="font-mono font-bold text-slate-900">
              $ {Math.round(metrics.topFaltantes.reduce((a, c) => a + c.costoReponer, 0)).toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Sección Gráfica 2: Consumo por Sector y Artículos Más Retirados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gráfico de Barras: Consumo por Sector */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Consumo por Sector del Taller
            </h3>
            <span className="text-xs font-mono text-slate-500">
              $ {Math.round(metrics.totalSalidasMonto).toLocaleString('es-AR')}
            </span>
          </div>

          <div className="space-y-3">
            {metrics.porSector.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No hay movimientos registrados para este filtro.
              </p>
            ) : (
              metrics.porSector.map((sec) => {
                const pct = Math.round((sec.monto / metrics.maxSectorMonto) * 100);
                return (
                  <div key={sec.sector} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-800">{sec.sector}</span>
                      <span className="font-mono font-bold text-slate-900">
                        $ {Math.round(sec.monto).toLocaleString('es-AR')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-slate-800 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ranking de Artículos Más Demandados en Taller */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Insumos de Mayor Rotación en Taller
            </h3>
            <span className="text-xs text-slate-500">Top 5 más retirados</span>
          </div>

          <div className="space-y-2">
            {metrics.topInsumos.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Sin retiros registrados aún.
              </p>
            ) : (
              metrics.topInsumos.map((item, idx) => (
                <div
                  key={item.nombre}
                  className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-900">{item.nombre}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {item.cantidad} {item.unidad || 'u'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sección Gráfica 3: Consumo por Colaborador (Técnicos y Lavadores) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Consumo por Colaborador (Técnicos y Lavadores)
            </h3>
            <p className="text-xs text-slate-500">
              Ranking de insumos retirados y valorizado económico por operario del taller
            </p>
          </div>

          {/* Filtros locales para el análisis */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Quién usa más vs Quién usa menos */}
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                onClick={() => setColabOrden('mas')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                  colabOrden === 'mas'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Mostrar primero los colaboradores con mayor consumo"
              >
                <ArrowUp className="w-3 h-3 text-amber-600" />
                <span>Mayor uso</span>
              </button>
              <button
                onClick={() => setColabOrden('menos')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                  colabOrden === 'menos'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Mostrar primero los colaboradores con menor consumo"
              >
                <ArrowDown className="w-3 h-3 text-blue-600" />
                <span>Menor uso</span>
              </button>
            </div>

            {/* Filtro Sector */}
            <select
              value={colabSectorFiltro}
              onChange={(e) => setColabSectorFiltro(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none font-medium shadow-2xs"
            >
              <option value="">Todas las áreas</option>
              {SECTORES.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            {/* Filtro Período */}
            <select
              value={colabPeriodoFiltro}
              onChange={(e) => setColabPeriodoFiltro(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none font-medium shadow-2xs"
            >
              <option value="todos">Todo el historial</option>
              <option value="este_mes">Este mes</option>
              <option value="30dias">Últimos 30 días</option>
            </select>
          </div>
        </div>

        {/* Resumen de KPIs de colaboradores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Operarios con retiros</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {consumoColaboradores.colaboradoresActivos}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Retiros autorizados</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {consumoColaboradores.totalPedidos} solicitud{consumoColaboradores.totalPedidos === 1 ? '' : 'es'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Monto total retirado</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              $ {Math.round(consumoColaboradores.totalConsumido).toLocaleString('es-AR')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Consumo promedio / operario</span>
            <span className="font-mono font-bold text-blue-900 text-sm">
              $ {consumoColaboradores.promedioConsumo.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Lista / Barras de Consumo */}
        <div className="space-y-3 pt-1">
          {consumoColaboradores.list.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No hay retiros autorizados para los filtros de colaborador seleccionados.
            </div>
          ) : (
            consumoColaboradores.list.map((c, idx) => {
              const pct = Math.min(100, Math.round((c.montoTotal / consumoColaboradores.maxMonto) * 100));
              const esTaller = c.sector.toLowerCase().includes('taller');

              return (
                <div
                  key={c.nombre}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] font-mono shrink-0 ${
                        colabOrden === 'mas'
                          ? idx === 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-slate-100 text-slate-600'
                          : 'bg-blue-50 text-blue-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{c.nombre}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          esTaller
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-teal-50 text-teal-700 border border-teal-100'
                        }`}
                      >
                        {c.sector}
                      </span>
                      {c.topInsumo && (
                        <span className="hidden md:inline text-[11px] text-slate-400">
                          · Más pedido: <span className="font-medium text-slate-600">{c.topInsumo}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs justify-between sm:justify-end">
                      <span className="text-slate-500 text-[11px]">
                        {c.retirosCount} pedido{c.retirosCount === 1 ? '' : 's'}
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        $ {Math.round(c.montoTotal).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        colabOrden === 'mas'
                          ? idx === 0
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                            : 'bg-slate-800'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal del Reporte de Faltantes y Reposición para Impresión / PDF */}
      <ReporteFaltantesModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
        stockList={stockList}
        provinciaFiltro={provinciaFiltro}
      />

      {/* Modal de Recepción de Pedidos En Camino */}
      <ModalRecepcionPedido
        isOpen={Boolean(recepcionModalItem)}
        onClose={() => setRecepcionModalItem(null)}
        session={session}
        item={recepcionModalItem}
        onSuccess={loadData}
      />
    </div>
  );
};
