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
} from 'lucide-react';
import { StockItem, Ingreso, Salida } from '../types';
import { PROVINCIAS } from '../data/config';
import { api } from '../services/api';
import { ReporteFaltantesModal } from './ReporteFaltantesModal';

export const Dashboard: React.FC = () => {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('');
  const [showReporteModal, setShowReporteModal] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stockRes] = await Promise.all([
        api.getStock(provinciaFiltro || undefined),
      ]);
      if (stockRes.ok && stockRes.data) {
        setStockList(stockRes.data);
      }

      const storedIngresos: Ingreso[] = JSON.parse(localStorage.getItem('ci_ingresos_v1') || '[]');
      const storedSalidas: Salida[] = JSON.parse(localStorage.getItem('ci_salidas_v1') || '[]');

      // Filtrar movimientos de prueba que venían en la maqueta inicial
      const idsPruebaIngresos = [
        'ING-20260920-00001',
        'ING-20260921-00002',
        'ING-20260922-00003',
        'ING-20260925-00004',
      ];
      const compsPrueba = [
        'FAC-A-0001-00084321',
        'FAC-B-0003-00012903',
        'FAC-A-0002-00045129',
        'FAC-A-0001-00084550',
      ];
      const idsPruebaSalidas = ['SAL-20260927-00001', 'SAL-20260929-00001', 'SAL-20260929-00002'];

      const ingresosReales = storedIngresos.filter(
        (i) => !idsPruebaIngresos.includes(i.idMovimiento) && !compsPrueba.includes(i.comprobante)
      );

      const salidasReales = storedSalidas.filter(
        (s) => !idsPruebaSalidas.includes(s.idSolicitud)
      );

      // Si localStorage aún tenía guardados los viejos de prueba, limpiarlos también del almacenamiento
      if (ingresosReales.length !== storedIngresos.length) {
        localStorage.setItem('ci_ingresos_v1', JSON.stringify(ingresosReales));
      }
      if (salidasReales.length !== storedSalidas.length) {
        localStorage.setItem('ci_salidas_v1', JSON.stringify(salidasReales));
      }

      setIngresos(
        provinciaFiltro
          ? ingresosReales.filter((i) => i.provincia.toLowerCase() === provinciaFiltro.toLowerCase())
          : ingresosReales
      );

      setSalidas(
        provinciaFiltro
          ? salidasReales.filter((s) => s.provincia.toLowerCase() === provinciaFiltro.toLowerCase())
          : salidasReales
      );
    } catch (err: any) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setIsLoading(false);
    }
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
      await api.limpiarMovimientosDePrueba();
      await loadData();
    } catch (e) {
      console.error('Error limpiando datos de prueba:', e);
    } finally {
      setIsCleaning(false);
    }
  };

  const metrics = useMemo(() => {
    const totalComprasMonto = ingresos.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const salidasValidas = salidas.filter(
      (s) => s.estado === 'AUTORIZADO' || s.estado === 'AUTORIZADO PARCIAL'
    );

    const totalSalidasMonto = salidasValidas.reduce((acc, curr) => acc + (curr.valorSalida || 0), 0);
    const valorStockActual = stockList.reduce((acc, curr) => acc + (curr.valorStock || 0), 0);

    const totalSolicitado = salidas.reduce((acc, curr) => acc + (curr.cantidadSolicitada || 0), 0);
    const totalAutorizado = salidas.reduce((acc, curr) => acc + (curr.cantidadAutorizada || 0), 0);
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
        };
      })
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 5);

    // Insumos más demandados (Salidas generales)
    const insumoMap = new Map<string, { nombre: string; cantidad: number; unidad?: string }>();
    for (const s of salidasValidas) {
      const existing = insumoMap.get(s.idInsumo) || { nombre: s.insumo, cantidad: 0 };
      existing.cantidad += s.cantidadAutorizada;
      insumoMap.set(s.idInsumo, existing);
    }
    const topInsumos = Array.from(insumoMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Consumo por sector
    const sectorMap = new Map<string, number>();
    for (const s of salidasValidas) {
      const sec = s.sector || 'Otros';
      sectorMap.set(sec, (sectorMap.get(sec) || 0) + (s.valorSalida || 0));
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
      tasaAprobacion,
      criticosCount: criticos.length,
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
  }, [stockList, ingresos, salidas]);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
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
            <option value="">Todas las bases</option>
            {PROVINCIAS.map((p) => (
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

          <button
            onClick={handleLimpiarPrueba}
            disabled={isCleaning}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-white text-xs font-medium flex items-center gap-1 transition-colors shadow-xs"
            title="Limpiar compras y retiros de prueba para arrancar en cero"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isCleaning ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Iniciar Operación Limpia</span>
          </button>
        </div>
      </div>

      {/* Alerta Destacada si hay Insumos Críticos */}
      {metrics.criticosCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-950">
                {metrics.criticosCount} {metrics.criticosCount === 1 ? 'insumo crítico' : 'insumos críticos'} · Reponer: <strong>${Math.round(metrics.costoReposicionTotal).toLocaleString('es-AR')}</strong>
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
            {ingresos.length} compras registradas
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
                    <div key={item.id + item.provincia} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                          {item.insumo}
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            ({item.provincia})
                          </span>
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[11px] text-slate-500">
                            Tiene: <strong>{item.stockActual}</strong> / Obj: {item.stockObjetivo}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                            Faltan {item.deficit} {item.unidad}
                          </span>
                        </div>
                      </div>

                      {/* Barra de progreso de llenado de stock */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${actualPct}%` }}
                          className={`h-full transition-all duration-300 ${
                            item.estado === 'CRITICO' ? 'bg-red-500' : 'bg-amber-400'
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
                    {item.cantidad} u.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal del Reporte de Faltantes y Reposición para Impresión / PDF */}
      <ReporteFaltantesModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
        stockList={stockList}
        provinciaFiltro={provinciaFiltro}
      />
    </div>
  );
};
