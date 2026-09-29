import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { MovimientoHistorial } from '../types';
import { api } from '../services/api';

export const UltimosMovimientos: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoHistorial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUltimosMovimientos(30);
      if (res.ok && res.data) {
        setMovimientos(res.data);
      }
    } catch (err: any) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Historial de Movimientos
          </h1>
          <span className="text-xs text-slate-500">
            Últimos ingresos y salidas registrados
          </span>
        </div>

        <button
          onClick={loadData}
          title="Actualizar"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Insumo</th>
                <th className="py-2.5 px-3 text-right">Cantidad</th>
                <th className="py-2.5 px-3">Responsable / Operario</th>
                <th className="py-2.5 px-3">Sector / Proveedor</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Cargando historial...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Sin movimientos registrados.
                  </td>
                </tr>
              ) : (
                movimientos.map((m, idx) => (
                  <tr key={`${m.id}_${idx}`} className="hover:bg-slate-50/70 font-mono text-[11px]">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {m.fechaHora}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {m.tipo === 'INGRESO' ? (
                        <span className="text-emerald-700 font-semibold">Ingreso</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Salida</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {m.insumo}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {m.cantidad} <span className="font-normal text-slate-400 text-[10px]">{m.unidad}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">
                      {m.persona}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">
                      {m.sectorOProveedor}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-800">
                      $ {Math.round(m.monto).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
