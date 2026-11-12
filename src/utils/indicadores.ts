import type { MovimientoHistorial } from '../types';

// Las fechas del historial ya están expresadas en la hora local de la base.
export function enPeriodo(fechaHora: string, desde = '', hasta = '') {
  if (desde && hasta && desde > hasta) return false;
  if (!desde && !hasta) return true;
  const fecha = fechaHora?.slice(0, 10);
  return Boolean(fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    (!desde || fecha >= desde) && (!hasta || fecha <= hasta));
}

export function costoLavado(movimientos: MovimientoHistorial[], mes: string, provincia: string, pasos: number) {
  const importes = { Caucho: 0, Desengrasante: 0, Shampoo: 0 };
  let retiros = 0;
  let sinCosto = 0;
  for (const m of movimientos) {
    if (!mes || !m.fechaHora?.startsWith(`${mes}-`) || m.tipo !== 'SALIDA' ||
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
