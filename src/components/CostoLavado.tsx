import React, { useMemo, useState } from 'react';
import type { MovimientoHistorial } from '../types';
import { costoLavado, type ModoCostoLavado } from '../utils/indicadores';

const dinero = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const CLAVE_MODO = 'autosol:modo-costo-lavado:v1';
type Periodo = { desde: string; hasta: string };

export function CostoLavado({ movimientos, provincia, cargando, error, mes, periodo, periodoLabel, onChangeMes }: {
  movimientos: MovimientoHistorial[]; provincia: string; cargando: boolean; error: string | null;
  mes: string; periodo?: Periodo; periodoLabel: string; onChangeMes?: (mes: string) => void;
}) {
  const [modo, setModo] = useState<ModoCostoLavado>(() => {
    try { return localStorage.getItem(CLAVE_MODO) === 'todo' ? 'todo' : 'principales'; } catch { return 'principales'; }
  });
  const cambiarModo = (nuevo: ModoCostoLavado) => {
    setModo(nuevo);
    try { localStorage.setItem(CLAVE_MODO, nuevo); } catch { /* ignore */ }
  };

  return <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
    <div className="flex flex-wrap justify-between items-end gap-3">
      <div><h2 className="text-base font-bold text-slate-900">Costo promedio por lavado</h2>
        <p className="text-xs text-slate-500">
          {modo === 'principales'
            ? `Retiros de caucho, desengrasante y shampoo · ${provincia || 'Todas las bases'}`
            : `Todos los insumos retirados en Lavadero · ${provincia || 'Todas las bases'}`}
        </p></div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs" role="group" aria-label="Insumos incluidos en el cálculo">
          <button
            type="button"
            onClick={() => cambiarModo('principales')}
            className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
              modo === 'principales' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Caucho, desengrasante y shampoo
          </button>
          <button
            type="button"
            onClick={() => cambiarModo('todo')}
            className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
              modo === 'todo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Todo Lavadero
          </button>
        </div>
        {!mes && <p className="text-xs font-medium text-slate-600 pb-2">{periodoLabel}</p>}
        {onChangeMes && (
          <label className="text-xs font-medium text-slate-700">Mes del indicador
            <input type="month" value={mes} onChange={e => onChangeMes(e.target.value)} className="block mt-1 border border-slate-200 rounded-lg px-3 py-2" />
          </label>
        )}
      </div>
    </div>
    <Calculo key={`${provincia}:${mes}:${periodo?.desde}:${periodo?.hasta}`} movimientos={movimientos} provincia={provincia} mes={mes} periodo={periodo} modo={modo} cargando={cargando} error={error} />
  </section>;
}

function Calculo({ movimientos, provincia, mes, cargando, error, periodo, modo }: {
  movimientos: MovimientoHistorial[]; provincia: string; mes: string; periodo?: Periodo; modo: ModoCostoLavado; cargando: boolean; error: string | null;
}) {
  const clave = `autosol:pasos-lavado:v1:${provincia || 'todas'}:${periodo ? `rango:${periodo.desde}:${periodo.hasta}` : mes}`;
  const [pasos, setPasos] = useState(() => { try { return localStorage.getItem(clave) || ''; } catch { return ''; } });
  const [guardado, setGuardado] = useState(true);
  const resultado = useMemo(() => costoLavado(movimientos, mes, provincia, Number(pasos), periodo, modo), [movimientos, mes, provincia, pasos, periodo, modo]);
  const invalido = pasos !== '' && (!Number.isSafeInteger(Number(pasos)) || Number(pasos) <= 0);
  const items = modo === 'principales'
    ? Object.entries(resultado.importes)
    : Object.entries(resultado.importes).sort((a, b) => b[1] - a[1]);
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
      {[...items, ['Total insumos', resultado.total] as const].map(([nombre, monto]) =>
        <div key={nombre} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{nombre}</p><strong>{cargando || error ? '—' : dinero(monto)}</strong></div>)}
    </div>
    <p className="text-xs text-slate-500">
      {modo === 'principales'
        ? 'Fórmula: costo de los tres insumos retirados en el período ÷ (pasos ingresados × 1,10). Incluye autorizaciones parciales; excluye compras y solicitudes pendientes, rechazadas o canceladas.'
        : 'Fórmula: costo total de los insumos retirados en Lavadero en el período ÷ (pasos ingresados × 1,10). Incluye autorizaciones parciales; excluye compras y solicitudes pendientes, rechazadas o canceladas.'}
    </p>
  </>;
}
