export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'AUTORIZADO'
  | 'AUTORIZADO PARCIAL'
  | 'RECHAZADO'
  | 'CANCELADO';

export type TipoIngreso = 'Compra' | 'Devolución' | 'Ajuste' | 'Stock inicial';

export type EstadoStock = 'SUFICIENTE' | 'CERCA_MINIMO' | 'CRITICO';

export interface Insumo {
  id: string;
  categoria: string;
  insumo: string;
  unidad: string;
  provincia: string;
  stockMinimo: number;
  stockObjetivo: number;
  activo: 'Sí' | 'No';
}

export interface Ingreso {
  idMovimiento: string;
  fechaHora: string;
  provincia: string;
  idInsumo: string;
  insumo: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  proveedor: string;
  tipoIngreso: TipoIngreso;
  comprobante: string;
  responsable: string;
  observaciones: string;
}

export interface Salida {
  idSolicitud: string;
  fechaHoraSolicitud: string;
  provincia: string;
  sector: string;
  idInsumo: string;
  insumo: string;
  solicitante: string;
  cantidadSolicitada: number;
  cantidadAutorizada: number;
  autorizadoPor: string;
  fechaHoraAutorizacion: string;
  costoUnitario: number;
  valorSalida: number;
  estado: EstadoSolicitud;
  observaciones: string;
  motivoRechazo: string;
}

export interface StockItem {
  idInsumo: string;
  provincia: string;
  categoria: string;
  insumo: string;
  unidad: string;
  totalIngresado: number;
  totalSalido: number;
  stockActual: number;
  costoPromedio: number;
  valorStock: number;
  stockMinimo: number;
  stockObjetivo: number;
  cantidadReponer: number;
  estado: EstadoStock;
}

export interface Colaborador {
  nombre: string;
  sector: string;
  provincia: string;
}

export interface Responsable {
  nombre: string;
  pin: string;
}

export interface AuthSession {
  token: string;
  responsableNombre: string;
  expiresAt: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  code?: string;
  details?: any;
}

export interface MovimientoHistorial {
  id: string;
  fechaHora: string;
  tipo: 'INGRESO' | 'SALIDA';
  insumo: string;
  unidad: string;
  provincia: string;
  cantidad: number;
  solicitado?: number;
  persona: string;
  sectorOProveedor: string;
  estado: string;
  monto: number;
}
