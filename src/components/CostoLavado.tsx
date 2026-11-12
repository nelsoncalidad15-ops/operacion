import React, { useMemo, useState } from 'react';
import type { MovimientoHistorial } from '../types';
import { costoLavado } from '../utils/indicadores';

const dinero = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const mesActual = () => {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${partes.find(p => p.type === 'year')?.value}-${partes.find(p => p.type === 'month')?.value}`;
};

export function CostoLavado({ movimientos, provincia, cargando, error }: {
  movimientos: MovimientoHistorial[]; provincia: string; cargando: boolean; error: string | null;
}) {
  const [mes, setMes] = useState(mesActual);
  return <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
    <div className="flex flex-wrap justify-between items-end gap-3">
      <div><h2 className="text-base font-bold text-slate-900">Costo promedio por lavado</h2>
        <p className="text-xs text-slate-500">Retiros de caucho, desengrasante y shampoo · {provincia || 'Todas las bases'}</p></div>
      <label className="text-xs font-medium text-slate-700">Mes del indicador
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="block mt-1 border border-slate-200 rounded-lg px-3 py-2" />
      </label>
    </div>
    <Calculo key={`${provincia}:${mes}`} movimientos={movimientos} provincia={provincia} mes={mes} cargando={cargando} error={error} />
  </section>;
}

function Calculo({ movimientos, provincia, mes, cargando, error }: {
  movimientos: MovimientoHistorial[]; provincia: string; mes: string; cargando: boolean; error: string | null;
}) {
  const clave = `autosol:pasos-lavado:v1:${provincia || 'todas'}:${mes}`;
  const [pasos, setPasos] = useState(() => { try { return localStorage.getItem(clave) || ''; } catch { return ''; } });
  const [guardado, setGuardado] = useState(true);
  const resultado = useMemo(() => costoLavado(movimientos, mes, provincia, Number(pasos)), [movimientos, mes, provincia, pasos]);
  const invalido = pasos !== '' && (!Number.isSafeInteger(Number(pasos)) || Number(pasos) <= 0);
  return <>
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Pasos / lavados realizados en el mes
          <input type="number" min="1" step="1" value={pasos} disabled={!mes} placeholder="Ej.: 100" aria-invalid={invalido}
            onChange={e => {
              const valor = e.target.value;
              setPasos(valor);
              try { if (valor) localStorage.setItem(clave, valor); else localStorage.removeItem(clave); setGuardado(true); }
              catch { setGuardado(false); }
            }} className="block w-full mt-1 rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <p className="text-xs text-slate-500 mt-2">{guardado ? 'Se recuerda por mes y base en este navegador.' : 'No se pudo guardar en este navegador.'}</p>
        {invalido && <p role="alert" className="text-xs text-red-700 mt-2">Ingresá una cantidad entera mayor que cero.</p>}
        <p className="text-sm mt-3">Pasos con el 10 % adicional: <strong>{resultado.ajustados.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</strong></p>
      </div>
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4" aria-live="polite">
        <p className="text-xs font-semibold text-blue-800">COSTO PROMEDIO POR LAVADO</p>
        <p className="text-3xl font-bold text-blue-950 my-2">{!cargando && !error && resultado.promedio !== null ? dinero(resultado.promedio) : '—'}</p>
        <p className="text-xs text-blue-900">{cargando ? 'Cargando movimientos…' : error ? 'No se pudo obtener el costo. Actualizá los datos.' : !mes ? 'Seleccioná un mes.' : !resultado.retiros ? 'No hay retiros autorizados de estos insumos en el mes.' : resultado.sinCosto ? `${resultado.sinCosto} retiro(s) sin costo válido. Revisá su valorización para calcular el indicador.` : !resultado.ajustados ? 'Ingresá la cantidad de pasos para calcular.' : `${dinero(resultado.total)} ÷ ${resultado.ajustados.toLocaleString('es-AR', { maximumFractionDigits: 1 })} pasos`}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
      {[...Object.entries(resultado.importes), ['Total insumos', resultado.total] as const].map(([nombre, monto]) =>
        <div key={nombre} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{nombre}</p><strong>{cargando || error ? '—' : dinero(monto)}</strong></div>)}
    </div>
    <p className="text-xs text-slate-500">Fórmula: costo de los tres insumos retirados en el mes ÷ (pasos ingresados × 1,10). Incluye autorizaciones parciales; excluye compras y solicitudes pendientes, rechazadas o canceladas.</p>
  </>;
}
