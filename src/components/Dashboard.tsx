import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { StockItem, Ingreso, Salida } from '../types';
import { PROVINCIAS } from '../data/config';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('');

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

      setIngresos(
        provinciaFiltro
          ? storedIngresos.filter((i) => i.provincia.toLowerCase() === provinciaFiltro.toLowerCase())
          : storedIngresos
      );

      setSalidas(
        provinciaFiltro
          ? storedSalidas.filter((s) => s.provincia.toLowerCase() === provinciaFiltro.toLowerCase())
          : storedSalidas
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

    // Insumos más demandados
    const insumoMap = new Map<string, { nombre: string; cantidad: number }>();
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

    return {
      valorStockActual,
      totalSalidasMonto,
      totalComprasMonto,
      tasaAprobacion,
      topInsumos,
      porSector,
    };
  }, [stockList, ingresos, salidas]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Resumen General
          </h1>
          <span className="text-xs text-slate-500">
            Indicadores de inventario y consumos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={provinciaFiltro}
            onChange={(e) => setProvinciaFiltro(e.target.value)}
            className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
          >
            <option value="">Todas las bases</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Valor en Inventario</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            $ {Math.round(metrics.valorStockActual).toLocaleString('es-AR')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Salidas al Taller</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            $ {Math.round(metrics.totalSalidasMonto).toLocaleString('es-AR')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Compras Registradas</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            $ {Math.round(metrics.totalComprasMonto).toLocaleString('es-AR')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500">Aprobación Solicitudes</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {metrics.tasaAprobacion}%
          </div>
        </div>
      </div>

      {/* 2 Grids: Top demand & Sector breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Demanded */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-900 mb-3">
            Insumos Más Demandados
          </h3>
          <div className="space-y-2">
            {metrics.topInsumos.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Sin retiros registrados.</p>
            ) : (
              metrics.topInsumos.map((item, idx) => (
                <div key={item.nombre} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-800">
                    <span className="text-slate-400 font-mono mr-1.5">{idx + 1}.</span>
                    {item.nombre}
                  </span>
                  <span className="font-mono font-medium text-slate-900">
                    {item.cantidad} u.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consumo por Sector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-900 mb-3">
            Consumo por Sector
          </h3>
          <div className="space-y-2">
            {metrics.porSector.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Sin retiros registrados.</p>
            ) : (
              metrics.porSector.map((sec) => (
                <div key={sec.sector} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-800">{sec.sector}</span>
                  <span className="font-mono font-medium text-slate-900">
                    $ {Math.round(sec.monto).toLocaleString('es-AR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
