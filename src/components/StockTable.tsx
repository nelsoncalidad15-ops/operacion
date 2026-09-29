import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, FileText } from 'lucide-react';
import { StockItem } from '../types';
import { PROVINCIAS } from '../data/config';
import { api } from '../services/api';
import { ReporteFaltantesModal } from './ReporteFaltantesModal';

export const StockTable: React.FC = () => {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('');
  const [showReporteModal, setShowReporteModal] = useState<boolean>(false);

  const loadStock = async () => {
    setIsLoading(true);
    try {
      const res = await api.getStock(selectedProvincia || undefined);
      if (res.ok && res.data) {
        setStockList(res.data);
      }
    } catch (err: any) {
      console.error('Error cargando stock:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [selectedProvincia]);

  const handleRecalcular = async () => {
    setIsRecalculating(true);
    try {
      const res = await api.recalcularStockCompleto();
      if (res.ok) {
        await loadStock();
      }
    } catch {
      // ignore
    } finally {
      setIsRecalculating(false);
    }
  };

  const filteredStock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stockList;
    return stockList.filter(
      (item) =>
        item.insumo.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q) ||
        item.idInsumo.toLowerCase().includes(q)
    );
  }, [stockList, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Inventario de Insumos
          </h1>
          <span className="text-xs text-slate-500">
            {filteredStock.length} artículos en catálogo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar insumo..."
              className="text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none w-44"
            />
          </div>

          <select
            value={selectedProvincia}
            onChange={(e) => setSelectedProvincia(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
          >
            <option value="">Todas</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={() => setShowReporteModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Generar e imprimir orden de faltantes"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reporte Faltantes</span>
          </button>

          <button
            onClick={handleRecalcular}
            disabled={isRecalculating}
            title="Recalcular stock"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Insumo</th>
                <th className="py-2.5 px-3">Base</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 px-3 text-right">Mínimo</th>
                <th className="py-2.5 px-3 text-right">Costo Prom.</th>
                <th className="py-2.5 px-3 text-right">Reponer</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Cargando inventario...
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No se encontraron insumos.
                  </td>
                </tr>
              ) : (
                filteredStock.map((row) => (
                  <tr key={row.idInsumo + '_' + row.provincia} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {row.idInsumo}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {row.insumo}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {row.provincia}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {row.stockActual} <span className="font-normal text-slate-400 text-[10px]">{row.unidad}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {row.stockMinimo}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      $ {Math.round(row.costoPromedio).toLocaleString('es-AR')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.cantidadReponer > 0 ? (
                        <span className="text-amber-600 font-bold">
                          +{row.cantidadReponer}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans text-[11px]">
                      {row.estado === 'CRITICO' ? (
                        <span className="text-red-600 font-semibold">Crítico</span>
                      ) : row.estado === 'CERCA_MINIMO' ? (
                        <span className="text-amber-600 font-medium">Bajo</span>
                      ) : (
                        <span className="text-emerald-600">Normal</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Reporte de Faltantes */}
      <ReporteFaltantesModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
        stockList={stockList}
        provinciaFiltro={selectedProvincia}
      />
    </div>
  );
};
