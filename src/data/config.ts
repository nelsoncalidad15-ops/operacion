import { Insumo, Ingreso, Salida, Colaborador } from '../types';

export const PROVINCIAS: string[] = ['Jujuy', 'Salta'];

export const SECTORES: string[] = ['Taller', 'Lavadero'];

export const COLABORADORES: Colaborador[] = [
  // Jujuy
  { nombre: 'Mauro Gutiérrez', sector: 'Taller', provincia: 'Jujuy' },
  { nombre: 'Carlos Quispe', sector: 'Taller', provincia: 'Jujuy' },
  { nombre: 'Esteban Martínez', sector: 'Lavadero', provincia: 'Jujuy' },
  { nombre: 'Franco Alarcón', sector: 'Lavadero', provincia: 'Jujuy' },
  // Salta
  { nombre: 'Gustavo Benítez', sector: 'Taller', provincia: 'Salta' },
  { nombre: 'Matías Villalba', sector: 'Lavadero', provincia: 'Salta' },
];

export const INITIAL_INSUMOS: Insumo[] = [
  {
    id: 'INS-001',
    categoria: 'Limpieza',
    insumo: 'Shampoo vehículos',
    unidad: 'Litros',
    provincia: 'Jujuy',
    stockMinimo: 10,
    stockObjetivo: 30,
    activo: 'Sí',
  },
  {
    id: 'INS-002',
    categoria: 'Librería',
    insumo: 'Resma A4',
    unidad: 'Unidad',
    provincia: 'Jujuy',
    stockMinimo: 5,
    stockObjetivo: 15,
    activo: 'Sí',
  },
  {
    id: 'INS-003',
    categoria: 'Seguridad',
    insumo: 'Guantes nitrilo (Caja x100)',
    unidad: 'Caja',
    provincia: 'Jujuy',
    stockMinimo: 8,
    stockObjetivo: 25,
    activo: 'Sí',
  },
  {
    id: 'INS-004',
    categoria: 'Mecánica',
    insumo: 'Grasa para chasis (Balde 18kg)',
    unidad: 'Balde',
    provincia: 'Jujuy',
    stockMinimo: 3,
    stockObjetivo: 8,
    activo: 'Sí',
  },
  {
    id: 'INS-005',
    categoria: 'Limpieza',
    insumo: 'Desengrasante motor',
    unidad: 'Litros',
    provincia: 'Jujuy',
    stockMinimo: 15,
    stockObjetivo: 40,
    activo: 'Sí',
  },
  {
    id: 'INS-006',
    categoria: 'Mecánica',
    insumo: 'Líquido de frenos DOT 4 (500ml)',
    unidad: 'Unidad',
    provincia: 'Jujuy',
    stockMinimo: 12,
    stockObjetivo: 30,
    activo: 'Sí',
  },
  // Salta
  {
    id: 'INS-007',
    categoria: 'Limpieza',
    insumo: 'Shampoo vehículos',
    unidad: 'Litros',
    provincia: 'Salta',
    stockMinimo: 8,
    stockObjetivo: 25,
    activo: 'Sí',
  },
  {
    id: 'INS-008',
    categoria: 'Seguridad',
    insumo: 'Guantes nitrilo (Caja x100)',
    unidad: 'Caja',
    provincia: 'Salta',
    stockMinimo: 6,
    stockObjetivo: 20,
    activo: 'Sí',
  },
  {
    id: 'INS-009',
    categoria: 'Librería',
    insumo: 'Resma A4',
    unidad: 'Unidad',
    provincia: 'Salta',
    stockMinimo: 4,
    stockObjetivo: 12,
    activo: 'Sí',
  },
];

export const INITIAL_INGRESOS: Ingreso[] = [];

export const INITIAL_SALIDAS: Salida[] = [];

export const DEMO_RESPONSABLES: { [pin: string]: string } = {
  '1423': 'Marcelo Pereyra',
  '7852': 'Pablo Guantay',
  '9021': 'Nelson Albarracín',
};
