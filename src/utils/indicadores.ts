import type { MovimientoHistorial } from '../types';

export function normalizarFechaHora(valor: string): string {
  if (!valor) return '';
  // Conservar las fechas locales existentes; convertir las que tienen zona horaria.
  if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(valor)) return valor.replace('T', ' ');
  const fecha = new Date(valor.replace(/\s*\([^)]*\)\s*$/, ''));
  if (Number.isNaN(fecha.getTime())) return valor;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha);
  const p = (tipo: string) => partes.find(parte => parte.type === tipo)?.value;
  return `${p('year')}-${p('month')}-${p('day')} ${p('hour')}:${p('minute')}:${p('second')}`;
}

// Las fechas del historial ya están expresadas en la hora local de la base.
export function enPeriodo(fechaHora: string, desde = '', hasta = '') {
  if (desde && hasta && desde > hasta) return false;
  if (!desde && !hasta) return true;
  const fecha = normalizarFechaHora(fechaHora)?.slice(0, 10);
  return Boolean(fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    (!desde || fecha >= desde) && (!hasta || fecha <= hasta));
}

export function costoLavado(movimientos: MovimientoHistorial[], mes: string, provincia: string, pasos: number) {
  const importes = { Caucho: 0, Desengrasante: 0, Shampoo: 0 };
  let retiros = 0;
  let sinCosto = 0;
  for (const m of movimientos) {
    if (!mes || !normalizarFechaHora(m.fechaHora)?.startsWith(`${mes}-`) || m.tipo !== 'SALIDA' ||
      !['AUTORIZADO', 'AUTORIZADO PARCIAL'].includes(m.estado) ||
      (provincia && m.provincia.toLowerCase() !== provincia.toLowerCase())) continue;
    const nombre = m.insumo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const grupo = /\bcaucho\b/.test(nombre) ? 'Caucho' : /\bdesengrasante\b/.test(nombre) ? 'Desengrasante' : /\b(shampoo|shampu|champu)\b/.test(nombre) ? 'Shampoo' : null;
    if (!grupo) continue;
    retiros++;
    if (!Number.isFinite(m.monto) || m.monto <= 0) { sinCosto++; continue; }
    importes[grupo] += m.monto;
  }
  const total = Object.values(importes).reduce((a, b) => a + b, 0);
  const ajustados = Number.isSafeInteger(pasos) && pasos > 0 ? pasos * 1.1 : 0;
  return { importes, total, ajustados, retiros, sinCosto,
    promedio: ajustados && retiros && !sinCosto ? total / ajustados : null };
}
