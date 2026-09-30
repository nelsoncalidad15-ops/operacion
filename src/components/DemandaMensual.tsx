import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, RefreshCw, ShieldCheck, ShoppingCart, TrendingUp } from 'lucide-react';
import { MovimientoHistorial, StockItem } from '../types';
import { PROVINCIAS } from '../data/config';
import { api } from '../services/api';
import { ReporteFaltantesModal } from './ReporteFaltantesModal';

const TEST_IDS = new Set(['SAL-20260927-00001', 'SAL-20260929-00001', 'SAL-20260929-00002']);

export const DemandaMensual: React.FC = () => {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [provinciaFiltro, setProvinciaFiltro] = useState('');
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [showReporteModal, setShowReporteModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, movimientosRes] = await Promise.all([
        api.getStock(provinciaFiltro || undefined), api.getUltimosMovimientos(10000),
      ]);
      if (stockRes.ok && stockRes.data) setStockList(stockRes.data);
      if (movimientosRes.ok && movimientosRes.data) {
        setMovimientos(movimientosRes.data.filter((m) => m.tipo === 'SALIDA' && !TEST_IDS.has(m.id) &&
          (m.estado === 'AUTORIZADO' || m.estado === 'AUTORIZADO PARCIAL') &&
          (!provinciaFiltro || m.provincia.toLowerCase() === provinciaFiltro.toLowerCase())));
      }
    } catch (err) { console.error('Error cargando demanda:', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, [provinciaFiltro]);

  const mesesDisponibles = useMemo(() => Array.from(new Set(
    movimientos.map((m) => m.fechaHora?.substring(0, 7)).filter((m): m is string => Boolean(m))
  )).sort().reverse(), [movimientos]);

  const plan = useMemo(() => {
    const salidasPeriodo = mesFiltro === 'todos' ? movimientos : movimientos.filter((m) => m.fechaHora?.startsWith(mesFiltro));
    const cantidadMeses = mesFiltro === 'todos' ? Math.max(1, mesesDisponibles.length) : 1;
    const consumoPorInsumo = new Map<string, { cantidad: number; valor: number }>();
    for (const salida of salidasPeriodo) {
      const coincidencia = stockList.find((i) => i.insumo === salida.insumo && i.provincia.toLowerCase() === salida.provincia.toLowerCase());
      const id = salida.idInsumo || coincidencia?.idInsumo;
      if (!id) continue;
      const previo = consumoPorInsumo.get(id) || { cantidad: 0, valor: 0 };
      previo.cantidad += salida.cantidad;
      previo.valor += salida.monto || 0;
      consumoPorInsumo.set(id, previo);
    }
    return stockList.map((item) => {
      const consumo = consumoPorInsumo.get(item.idInsumo) || { cantidad: 0, valor: 0 };
      const consumoMensual = consumo.cantidad / cantidadMeses;
      const stockSeguridad = item.stockMinimo || Math.ceil(consumoMensual * 0.25) || 1;
      const puntoPedido = Math.ceil(consumoMensual + stockSeguridad);
      const nivelObjetivo = Math.max(item.stockObjetivo, Math.ceil(consumoMensual * 2 + stockSeguridad));
      const pedidoSugerido = item.stockActual <= puntoPedido ? Math.max(0, nivelObjetivo - item.stockActual) : 0;
      let rotacion: 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_MOVIMIENTO' = 'SIN_MOVIMIENTO';
      if (consumoMensual > 0) rotacion = consumoMensual >= Math.max(item.stockMinimo, 1) ? 'ALTA' : consumoMensual > 2 ? 'MEDIA' : 'BAJA';
      return { ...item, consumoMensual, stockSeguridad, puntoPedido, nivelObjetivo, pedidoSugerido,
        costoPedidoSugerido: pedidoSugerido * (item.costoPromedio || 0), rotacion };
    }).sort((a, b) => b.pedidoSugerido - a.pedidoSugerido || b.consumoMensual - a.consumoMensual);
  }, [stockList, movimientos, mesFiltro, mesesDisponibles.length]);

  const totalPresupuesto = plan.reduce((total, item) => total + item.costoPedidoSugerido, 0);

  return <div className="max-w-6xl mx-auto py-6 px-4 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
      <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><ShoppingCart className="w-4 h-4" /></div><h1 className="text-xl font-bold text-slate-900">Plan de reposición</h1></div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowReporteModal(true)} className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"><FileText className="w-4 h-4" />Reporte PDF</button>
        <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /><select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="bg-transparent font-semibold focus:outline-none"><option value="todos">Promedio histórico mensual</option>{mesesDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
        <select value={provinciaFiltro} onChange={(e) => setProvinciaFiltro(e.target.value)} className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white"><option value="">Todas las bases</option>{PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <button onClick={loadData} className="p-1.5 rounded-lg border border-slate-200 text-slate-600" title="Actualizar"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /></button>
      </div>
    </div>
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-950"><strong>Método mínimo–máximo:</strong> se pide cuando el stock llega al punto de pedido (consumo mensual + reserva de seguridad). Se repone hasta el objetivo, que cubre dos meses de consumo + seguridad. El mínimo configurado se usa como reserva.</div>
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden"><div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase"><tr>
        <th className="py-2.5 px-3">Insumo</th><th className="py-2.5 px-3">Base</th><th className="py-2.5 px-3 text-right">Stock</th><th className="py-2.5 px-3 text-right text-indigo-700 bg-indigo-50/50">Consumo/mes</th><th className="py-2.5 px-3 text-center">Rotación</th><th className="py-2.5 px-3 text-right">Punto pedido</th><th className="py-2.5 px-3 text-right">Objetivo</th><th className="py-2.5 px-3 text-right bg-amber-50">Pedir</th><th className="py-2.5 px-3 text-right">Costo est.</th>
      </tr></thead><tbody className="divide-y divide-slate-100 font-mono text-xs">{plan.map((item) => <tr key={`${item.idInsumo}-${item.provincia}`} className="hover:bg-slate-50/80">
        <td className="py-2 px-3 font-sans"><span className="font-bold text-slate-900 block">{item.insumo}</span><span className="text-[10px] text-slate-400">{item.idInsumo} · {item.categoria}</span></td><td className="py-2 px-3 font-sans text-slate-600">{item.provincia}</td><td className="py-2 px-3 text-right font-bold">{item.stockActual} <small className="font-normal text-slate-400">{item.unidad}</small></td>
        <td className="py-2 px-3 text-right font-black text-indigo-900 bg-indigo-50/30">{item.consumoMensual > 0 ? `${Math.ceil(item.consumoMensual)} ${item.unidad}` : <span className="text-slate-300 font-normal">0</span>}</td>
        <td className="py-2 px-3 text-center font-sans">{item.rotacion === 'ALTA' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700"><TrendingUp className="w-3 h-3" />Alta</span> : item.rotacion === 'MEDIA' ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Media</span> : item.rotacion === 'BAJA' ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Baja</span> : <span className="text-slate-300">—</span>}</td>
        <td className="py-2 px-3 text-right text-slate-600">{item.puntoPedido} {item.unidad}</td><td className="py-2 px-3 text-right text-slate-600">{item.nivelObjetivo} {item.unidad}</td><td className="py-2 px-3 text-right font-bold bg-amber-50/70">{item.pedidoSugerido > 0 ? <span className="text-amber-900 font-black">+{item.pedidoSugerido} {item.unidad}</span> : <span className="text-emerald-600 font-sans font-medium inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />OK</span>}</td><td className="py-2 px-3 text-right font-bold">{item.costoPedidoSugerido > 0 ? `$ ${Math.round(item.costoPedidoSugerido).toLocaleString('es-AR')}` : <span className="text-slate-300">$ 0</span>}</td>
      </tr>)}</tbody></table>
    </div><div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs"><span className="text-slate-500">{plan.filter((p) => p.pedidoSugerido > 0).length} insumos a reponer</span><span className="font-mono font-bold">Total: $ {Math.round(totalPresupuesto).toLocaleString('es-AR')}</span></div></div>
    <ReporteFaltantesModal isOpen={showReporteModal} onClose={() => setShowReporteModal(false)} stockList={stockList} provinciaFiltro={provinciaFiltro} />
  </div>;
};
