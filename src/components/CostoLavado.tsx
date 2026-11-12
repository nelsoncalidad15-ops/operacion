import React, { useMemo, useState } from 'react';
import type { MovimientoHistorial } from '../types';
import { costoLavado } from '../utils/indicadores';

const dinero = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
type Periodo = { desde: string; hasta: string };
export function CostoLavado({ movimientos, provincia, cargando, error, mes, periodo, periodoLabel }: {
  movimientos: MovimientoHistorial[]; provincia: string; cargando: boolean; error: string | null;
  mes: string; periodo?: Periodo; periodoLabel: string;
}) {
  return <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
    <div className="flex flex-wrap justify-between items-end gap-3">
      <div><h2 className="text-base font-bold text-slate-900">Costo promedio por lavado</h2>
        <p className="text-xs text-slate-500">Retiros de caucho, desengrasante y shampoo · {provincia || 'Todas las bases'}</p></div>
      <p className="text-xs font-medium text-slate-600">{periodoLabel}</p>
    </div>
    <Calculo key={`${provincia}:${mes}:${periodo?.desde}:${periodo?.hasta}`} movimientos={movimientos} provincia={provincia} mes={mes} periodo={periodo} cargando={cargando} error={error} />
  </section>;
}

function Calculo({ movimientos, provincia, mes, cargando, error, periodo }: {
  movimientos: MovimientoHistorial[]; provincia: string; mes: string; periodo?: Periodo; cargando: boolean; error: string | null;
}) {
  const clave = `autosol:pasos-lavado:v1:${provincia || 'todas'}:${periodo ? `rango:${periodo.desde}:${periodo.hasta}` : mes}`;
  const [pasos, setPasos] = useState(() => { try { return localStorage.getItem(clave) || ''; } catch { return ''; } });
  const [guardado, setGuardado] = useState(true);
  const resultado = useMemo(() => costoLavado(movimientos, mes, provincia, Number(pasos), periodo), [movimientos, mes, provincia, pasos, periodo]);
  const invalido = pasos !== '' && (!Number.isSafeInteger(Number(pasos)) || Number(pasos) <= 0);
  return <>
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Pasos / lavados realizados en el período
          <input type="number" min="1" step="1" value={pasos} disabled={!mes && !periodo} placeholder="Ej.: 100" aria-invalid={invalido}
            onChange={e => {
              const valor = e.target.value;
              setPasos(valor);
              try { if (valor) localStorage.setItem(clave, valor); else localStorage.removeItem(clave); setGuardado(true); }
              catch { setGuardado(false); }
            }} className="block w-full mt-1 rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <p className="text-xs text-slate-500 mt-2">{guardado ? 'Se recuerda por período y base en este navegador.' : 'No se pudo guardar en este navegador.'}</p>
        {invalido && <p role="alert" className="text-xs text-red-700 mt-2">Ingresá una cantidad entera mayor que cero.</p>}
        <p className="text-sm mt-3">Pasos con el 10 % adicional: <strong>{resultado.ajustados.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</strong></p>
      </div>
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4" aria-live="polite">
        <p className="text-xs font-semibold text-blue-800">COSTO PROMEDIO POR LAVADO</p>
        <p className="text-3xl font-bold text-blue-950 my-2">{!cargando && !error && resultado.promedio !== null ? dinero(resultado.promedio) : '—'}</p>
        <p className="text-xs text-blue-900">{cargando ? 'Cargando movimientos…' : error ? 'No se pudo obtener el costo. Actualizá los datos.' : !mes && !periodo ? 'Seleccioná un período.' : !resultado.retiros ? 'No hay retiros autorizados de estos insumos en el período.' : resultado.sinCosto ? `${resultado.sinCosto} retiro(s) sin costo válido. Revisá su valorización para calcular el indicador.` : !resultado.ajustados ? 'Ingresá la cantidad de pasos para calcular.' : `${dinero(resultado.total)} ÷ ${resultado.ajustados.toLocaleString('es-AR', { maximumFractionDigits: 1 })} pasos`}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
      {[...Object.entries(resultado.importes), ['Total insumos', resultado.total] as const].map(([nombre, monto]) =>
        <div key={nombre} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{nombre}</p><strong>{cargando || error ? '—' : dinero(monto)}</strong></div>)}
    </div>
    <p className="text-xs text-slate-500">Fórmula: costo de los tres insumos retirados en el período ÷ (pasos ingresados × 1,10). Incluye autorizaciones parciales; excluye compras y solicitudes pendientes, rechazadas o canceladas.</p>
  </>;
}
