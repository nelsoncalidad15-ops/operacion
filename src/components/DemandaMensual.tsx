import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Calendar,
  ShoppingCart,
  ShieldCheck,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { StockItem, Salida } from '../types';
import { PROVINCIAS } from '../data/config';
import { api } from '../services/api';
import { ReporteFaltantesModal } from './ReporteFaltantesModal';

export const DemandaMensual: React.FC = () => {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('');
  const [mesFiltro, setMesFiltro] = useState<string>('todos');
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

      const storedSalidas: Salida[] = JSON.parse(localStorage.getItem('ci_salidas_v1') || '[]');

      // Filtrar pruebas
      const idsPruebaSalidas = ['SAL-20260927-00001', 'SAL-20260929-00001', 'SAL-20260929-00002'];
      const salidasReales = storedSalidas.filter(
        (s) => !idsPruebaSalidas.includes(s.idSolicitud)
      );

      setSalidas(
        provinciaFiltro
          ? salidasReales.filter((s) => s.provincia.toLowerCase() === provinciaFiltro.toLowerCase())
          : salidasReales
      );
    } catch (err: any) {
      console.error('Error cargando demanda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [provinciaFiltro]);

  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    for (const s of salidas) {
      const fecha = s.fechaHoraAutorizacion || s.fechaHoraSolicitud;
      if (fecha && fecha.length >= 7) {
        setMeses.add(fecha.substring(0, 7));
      }
    }
    return Array.from(setMeses).sort().reverse();
  }, [salidas]);

  const plan = useMemo(() => {
    const salidasValidas = salidas.filter(
      (s) => s.estado === 'AUTORIZADO' || s.estado === 'AUTORIZADO PARCIAL'
    );

    const salidasMes = mesFiltro === 'todos'
      ? salidasValidas
      : salidasValidas.filter((s) => {
          const fecha = s.fechaHoraAutorizacion || s.fechaHoraSolicitud;
          return fecha && fecha.startsWith(mesFiltro);
        });

    // Consumo por insumo en el período seleccionado
    const consumoPorInsumo = new Map<string, { totalRetirado: number; valorTotal: number; retirosCount: number }>();
    for (const s of salidasMes) {
      const id = s.idInsumo;
      const prev = consumoPorInsumo.get(id) || { totalRetirado: 0, valorTotal: 0, retirosCount: 0 };
      prev.totalRetirado += s.cantidadAutorizada;
      prev.valorTotal += s.valorSalida || 0;
      prev.retirosCount += 1;
      consumoPorInsumo.set(id, prev);
    }

    const items = stockList.map((item) => {
      const consumo = consumoPorInsumo.get(item.idInsumo) || { totalRetirado: 0, valorTotal: 0, retirosCount: 0 };
      const consumido = consumo.totalRetirado;

      // Fórmula correcta basada en demanda real:
      // Pedido = Consumo del mes + Backup de seguridad (stock mínimo) - Stock actual
      const backupSeguridad = item.stockMinimo || Math.round(item.stockObjetivo * 0.3) || 1;
      const necesidadTotal = consumido + backupSeguridad;
      const pedidoSugerido = Math.max(0, necesidadTotal - item.stockActual);

      let rotacion: 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_MOVIMIENTO' = 'SIN_MOVIMIENTO';
      if (consumido > 0) {
        if (consumido >= item.stockMinimo && item.stockMinimo > 0) {
          rotacion = 'ALTA';
        } else if (consumido > 2) {
          rotacion = 'MEDIA';
        } else {
          rotacion = 'BAJA';
        }
      }

      return {
        id: item.idInsumo,
        insumo: item.insumo,
        categoria: item.categoria,
        provincia: item.provincia,
        unidad: item.unidad,
        stockActual: item.stockActual,
        stockMinimo: item.stockMinimo,
        stockObjetivo: item.stockObjetivo,
        consumido,
        costoPromedio: item.costoPromedio || 0,
        montoConsumido: consumo.valorTotal,
        backupSeguridad,
        pedidoSugerido,
        costoPedidoSugerido: pedidoSugerido * (item.costoPromedio || 0),
        rotacion,
      };
    });

    items.sort((a, b) => {
      if (b.consumido !== a.consumido) return b.consumido - a.consumido;
      return b.pedidoSugerido - a.pedidoSugerido;
    });

    return items;
  }, [stockList, salidas, mesFiltro]);

  const totalPresupuesto = plan.reduce((a, b) => a + b.costoPedidoSugerido, 0);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Demanda Mensual
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowReporteModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Reporte PDF</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="todos">Histórico Total</option>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

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
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-3">Insumo</th>
                <th className="py-2.5 px-3">Base</th>
                <th className="py-2.5 px-3 text-right">Stock Actual</th>
                <th className="py-2.5 px-3 text-right text-indigo-700 bg-indigo-50/50">
                  Consumo Mes
                </th>
                <th className="py-2.5 px-3 text-center">Rotación</th>
                <th className="py-2.5 px-3 text-right">Backup Mín.</th>
                <th className="py-2.5 px-3 text-right bg-amber-50 font-bold text-amber-950">
                  Pedir
                </th>
                <th className="py-2.5 px-3 text-right">Costo Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {plan.map((item) => (
                <tr key={item.id + item.provincia} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-sans">
                    <span className="font-bold text-slate-900 block">{item.insumo}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.id} · {item.categoria}</span>
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-600">{item.provincia}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {item.stockActual} <span className="font-normal text-[10px] text-slate-400">{item.unidad}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-black text-indigo-900 bg-indigo-50/30">
                    {item.consumido > 0 ? (
                      <span>{item.consumido} {item.unidad}</span>
                    ) : (
                      <span className="text-slate-300 font-normal">0</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-sans">
                    {item.rotacion === 'ALTA' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        <TrendingUp className="w-3 h-3" /> Alta
                      </span>
                    ) : item.rotacion === 'MEDIA' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                        Media
                      </span>
                    ) : item.rotacion === 'BAJA' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-normal bg-slate-100 text-slate-600">
                        Baja
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {item.backupSeguridad} {item.unidad}
                  </td>
                  <td className="py-2 px-3 text-right font-bold bg-amber-50/70 text-amber-950">
                    {item.pedidoSugerido > 0 ? (
                      <span className="text-amber-900 font-black">
                        +{item.pedidoSugerido} {item.unidad}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-sans font-medium text-[11px] flex items-center justify-end gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> OK
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {item.costoPedidoSugerido > 0 ? (
                      `$ ${Math.round(item.costoPedidoSugerido).toLocaleString('es-AR')}`
                    ) : (
                      <span className="text-slate-300">$ 0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {plan.filter((p) => p.pedidoSugerido > 0).length} insumos a reponer
          </span>
          <span className="font-mono font-bold text-slate-900">
            Total: $ {Math.round(totalPresupuesto).toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      <ReporteFaltantesModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
        stockList={stockList}
        provinciaFiltro={provinciaFiltro}
      />
    </div>
  );
};
