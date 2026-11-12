import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enPeriodo, costoLavado } from '../src/utils/indicadores.ts';
import type { MovimientoHistorial } from '../src/types/index.ts';

const retiro = (extra: Partial<MovimientoHistorial> = {}): MovimientoHistorial => ({
  id: '1', fechaHora: '2026-10-31 23:59:59', tipo: 'SALIDA', insumo: 'Shampoo concentrado',
  unidad: 'L', provincia: 'Jujuy', cantidad: 10, persona: 'Operario', sectorOProveedor: 'Lavado',
  estado: 'AUTORIZADO', monto: 1100, ...extra,
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

test('suma los tres insumos y divide por pasos más 10%, respetando mes, base y estado', () => {
  const resultado = costoLavado([
    retiro(), retiro({ insumo: 'Caucho líquido', monto: 1100 }),
    retiro({ insumo: 'Desengrasante', estado: 'AUTORIZADO PARCIAL', monto: 1100 }),
    ...['PENDIENTE', 'RECHAZADO', 'CANCELADO'].map(estado => retiro({ estado })),
    retiro({ tipo: 'INGRESO' }), retiro({ provincia: 'Salta' }),
    retiro({ fechaHora: '2026-11-01' }), retiro({ insumo: 'Aceite' }),
  ], '2026-10', 'Jujuy', 100);
  assert.equal(resultado.total, 3300);
  assert.equal(resultado.retiros, 3);
  assert.ok(Math.abs(resultado.promedio! - 30) < 1e-10);
});

test('no muestra promedio con pasos inválidos, sin movimientos o sin valorización', () => {
  for (const pasos of [0, -1, 1.5, NaN, Infinity]) assert.equal(costoLavado([retiro()], '2026-10', 'Jujuy', pasos).promedio, null);
  assert.equal(costoLavado([], '2026-10', 'Jujuy', 100).promedio, null);
  assert.equal(costoLavado([retiro({ monto: 0 })], '2026-10', 'Jujuy', 100).promedio, null);
});
