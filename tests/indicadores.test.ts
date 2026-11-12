import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enPeriodo, costoLavado, normalizarFechaHora } from '../src/utils/indicadores.ts';
import type { MovimientoHistorial } from '../src/types/index.ts';

const retiro = (extra: Partial<MovimientoHistorial> = {}): MovimientoHistorial => ({
  id: '1', fechaHora: '2026-10-31 23:59:59', tipo: 'SALIDA', insumo: 'Shampoo concentrado',
  unidad: 'L', provincia: 'Jujuy', cantidad: 10, persona: 'Operario', sectorOProveedor: 'Lavado',
  estado: 'AUTORIZADO', monto: 1100, ...extra,
});

test('fechas reales de Google Sheets y cambio de mes en hora argentina', () => {
  const fecha = 'Wed Oct 14 2026 08:46:31 GMT-0300 (hora estándar de Argentina)';
  assert.equal(normalizarFechaHora(fecha), '2026-10-14 08:46:31');
  assert.equal(normalizarFechaHora('2026-11-01T01:00:00.000Z'), '2026-10-31 22:00:00');
  assert.equal(normalizarFechaHora('2026-10-01 00:00:00'), '2026-10-01 00:00:00');
  assert.ok(enPeriodo(fecha, '2026-10-01', '2026-10-31'));
  assert.equal(costoLavado([retiro({ fechaHora: fecha })], '2026-10', 'Jujuy', 100).retiros, 1);
});

test('período inclusivo, abierto, entre meses y rango invertido', () => {
  for (const fecha of ['2026-10-01 00:00:00', '2026-10-31 23:59:59']) assert.ok(enPeriodo(fecha, '2026-10-01', '2026-10-31'));
  assert.equal(enPeriodo('2026-11-01', '2026-10-01', '2026-10-31'), false);
  assert.ok(enPeriodo('2026-11-01', '2026-10-01', '2026-11-02'));
  assert.ok(enPeriodo('2026-10-01', '', '2026-10-31'));
  assert.ok(enPeriodo('2026-11-01', '2026-10-01'));
  assert.equal(enPeriodo('2026-10-10', '2026-10-31', '2026-10-01'), false);
  assert.equal(enPeriodo('', '2026-10-01'), false);
});

test('suma todos los insumos de Lavadero y divide por pasos más 10%, respetando período, sector, base y estado', () => {
  const resultado = costoLavado([
    retiro(), retiro({ insumo: 'Caucho líquido', monto: 1100 }),
    retiro({ insumo: 'Desengrasante', estado: 'AUTORIZADO PARCIAL', monto: 1100 }),
    retiro({ insumo: 'Rejilla 2 hilos', monto: 1100 }),
    retiro({ insumo: 'Cepillo Cercrin', monto: 1100 }),
    ...['PENDIENTE', 'RECHAZADO', 'CANCELADO'].map(estado => retiro({ estado })),
    retiro({ tipo: 'INGRESO' }), retiro({ provincia: 'Salta' }),
    retiro({ fechaHora: '2026-11-01' }), retiro({ insumo: 'Caucho', sectorOProveedor: 'Taller', sector: 'Taller' }),
  ], '2026-10', 'Jujuy', 100);
  assert.equal(resultado.total, 5500);
  assert.equal(resultado.retiros, 5);
  assert.ok(Math.abs(resultado.promedio! - 50) < 1e-10);
  const porRango = costoLavado([
    retiro({ fechaHora: '2026-10-15 10:00:00', monto: 2200 }),
    retiro({ fechaHora: '2026-11-05 10:00:00', monto: 1100 }),
  ], '', 'Jujuy', 100, { desde: '2026-10-01', hasta: '2026-10-31' });
  assert.equal(porRango.total, 2200);
  assert.equal(porRango.retiros, 1);
  assert.ok(Math.abs(porRango.promedio! - 20) < 1e-10);
});

test('no muestra promedio con pasos inválidos, sin movimientos o sin valorización', () => {
  for (const pasos of [0, -1, 1.5, NaN, Infinity]) assert.equal(costoLavado([retiro()], '2026-10', 'Jujuy', pasos).promedio, null);
  assert.equal(costoLavado([], '2026-10', 'Jujuy', 100).promedio, null);
  assert.equal(costoLavado([retiro({ monto: 0 })], '2026-10', 'Jujuy', 100).promedio, null);
});
