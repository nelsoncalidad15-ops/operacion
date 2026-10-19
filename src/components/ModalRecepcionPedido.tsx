import React, { useState } from 'react';
import { PackageCheck, X, AlertCircle } from 'lucide-react';
import { AuthSession } from '../types';
import { api } from '../services/api';

interface ModalRecepcionPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthSession;
  item: {
    id: string;
    insumo: string;
    provincia: string;
    unidad: string;
    deficit: number;
    costoPromedio: number;
    pedidoEnCamino?: {
      cantidadPedida: number;
      proveedor?: string;
    } | null;
  } | null;
  onSuccess: () => void;
}

export const ModalRecepcionPedido: React.FC<ModalRecepcionPedidoProps> = ({
  isOpen,
  onClose,
  session,
  item,
  onSuccess,
}) => {
  if (!isOpen || !item) return null;

  const defaultCantidad = item.pedidoEnCamino?.cantidadPedida || item.deficit || 1;
  const [cantidad, setCantidad] = useState<number>(defaultCantidad);
  const [precioUnitario, setPrecioUnitario] = useState<number>(item.costoPromedio || 0);
  const [proveedor, setProveedor] = useState<string>(item.pedidoEnCamino?.proveedor || '');
  const [comprobante, setComprobante] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('Recepción de pedido en camino');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cantidad <= 0) {
      setErrorMessage('La cantidad recibida debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.registrarIngreso(
        {
          provincia: item.provincia,
          idInsumo: item.id,
          cantidad: Number(cantidad),
          precioUnitario: Number(precioUnitario),
          proveedor: proveedor.trim() || 'Proveedor taller',
          tipoIngreso: 'Compra',
          comprobante: comprobante.trim(),
          observaciones: observaciones.trim(),
        },
        session.token
      );

      if (res.ok) {
        // Quitar estado de pedido en camino
        api.quitarPedidoEnCamino(item.id, item.provincia);
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'No se pudo registrar el ingreso.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recepción en Pañol</h3>
              <p className="text-[11px] text-slate-500">Ingresar mercadería que estaba en camino</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Insumo a ingresar</div>
            <div className="font-bold text-slate-900 text-sm">{item.insumo}</div>
            <div className="text-slate-500 text-[11px]">
              Base: <strong className="text-slate-700">{item.provincia}</strong> · Código: {item.id}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cantidad recibida ({item.unidad}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                required
                className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Precio unitario ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre proveedor"
                className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nº Comprobante / Remito</label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="Remito / Factura"
                className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Ingresando...' : 'Confirmar Ingreso a Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
