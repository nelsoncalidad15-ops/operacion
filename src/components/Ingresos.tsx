import React, { useState, useEffect, useMemo } from 'react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Insumo, TipoIngreso, AuthSession, Ingreso } from '../types';
import { PROVINCIAS } from '../data/config';
import { api } from '../services/api';

interface IngresosProps {
  session: AuthSession | null;
  onSessionChange: (session: AuthSession | null) => void;
  onSuccessIngreso: () => void;
}

export const Ingresos: React.FC<IngresosProps> = ({
  session,
  onSessionChange,
  onSuccessIngreso,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isValidatingPin, setIsValidatingPin] = useState<boolean>(false);

  const [provincia, setProvincia] = useState<string>('Jujuy');
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(10);
  const [precioUnitario, setPrecioUnitario] = useState<number>(0);
  const [proveedor, setProveedor] = useState<string>('');
  const [tipoIngreso, setTipoIngreso] = useState<TipoIngreso>('Compra');
  const [comprobante, setComprobante] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<Ingreso | null>(null);

  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  const [proveedoresSugeridos, setProveedoresSugeridos] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insRes, provs] = await Promise.all([
          api.getInsumos(provincia),
          api.getProveedoresSugeridos(),
        ]);
        if (insRes.ok && insRes.data) {
          setInsumosList(insRes.data.filter((i) => i.activo === 'Sí'));
        }
        setProveedoresSugeridos(provs);
      } catch (err: any) {
        console.error('Error cargando insumos:', err);
      }
    };
    fetchData();
  }, [provincia]);

  const currentInsumo = useMemo(() => {
    return insumosList.find((i) => i.id === selectedInsumoId);
  }, [insumosList, selectedInsumoId]);

  const totalCompra = useMemo(() => {
    return (cantidad || 0) * (precioUnitario || 0);
  }, [cantidad, precioUnitario]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setIsValidatingPin(true);
    setPinError(null);
    try {
      const res = await api.validarPin(pinInput.trim());
      if (res.ok && res.data) {
        onSessionChange(res.data);
        setPinInput('');
      } else {
        setPinError(res.message || 'PIN incorrecto.');
      }
    } catch {
      setPinError('Error de autenticación.');
    } finally {
      setIsValidatingPin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!session) {
      setErrorMessage('Iniciá sesión para registrar ingresos.');
      return;
    }
    if (!selectedInsumoId || !currentInsumo) {
      setErrorMessage('Seleccioná un insumo.');
      return;
    }
    if (cantidad <= 0) {
      setErrorMessage('La cantidad debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.registrarIngreso(
        {
          provincia,
          idInsumo: currentInsumo.id,
          cantidad,
          precioUnitario,
          proveedor: proveedor.trim() || 'Proveedor taller',
          tipoIngreso,
          comprobante: comprobante.trim() || 'S/N',
        },
        session.token
      );

      if (res.ok && res.data) {
        setSuccessData(res.data);
        onSuccessIngreso();
      } else {
        setErrorMessage(res.message || 'Error al guardar.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setSelectedInsumoId('');
    setCantidad(10);
    setPrecioUnitario(0);
    setProveedor('');
    setComprobante('');
    setErrorMessage(null);
  };

  if (!session) {
    return (
      <div className="max-w-sm mx-auto py-12 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Ingreso de Mercadería
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Ingresá tu PIN para cargar compras.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full text-center tracking-[0.3em] font-mono text-2xl py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400"
              autoFocus
            />

            {pinError && (
              <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              disabled={isValidatingPin || !pinInput.trim()}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
            >
              {isValidatingPin ? 'Validando...' : 'Ingresar'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-4">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-base font-bold text-slate-900">
          Registrar Ingreso
        </h1>
        <p className="text-xs text-slate-500">
          Carga de compras y remitos de mercadería.
        </p>
      </div>

      {successData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Ingreso Registrado
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Se actualizaron las existencias de {successData.insumo}.
          </p>

          <div className="my-4 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Cantidad:</span>
              <span className="font-mono font-bold text-slate-800">{successData.cantidad} {currentInsumo?.unidad}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Precio Unitario:</span>
              <span className="font-mono text-slate-800">$ {successData.precioUnitario.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total:</span>
              <span className="font-mono font-bold text-slate-900">$ {successData.total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Registrar Otro
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5">
          {/* Base */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Base
            </label>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {PROVINCIAS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvincia(p)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    provincia === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Insumo */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Insumo
            </label>
            <select
              value={selectedInsumoId}
              onChange={(e) => setSelectedInsumoId(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
              required
            >
              <option value="">-- Seleccionar --</option>
              {insumosList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.insumo} ({i.categoria} · {i.unidad})
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad & Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Precio Unitario ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Total Preview */}
          <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
            <span className="text-slate-500">Total Ingreso:</span>
            <span className="font-mono font-bold text-slate-900">$ {totalCompra.toLocaleString('es-AR')}</span>
          </div>

          {/* Proveedor & Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Proveedor
              </label>
              <input
                type="text"
                list="proveedores"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre proveedor"
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
              />
              <datalist id="proveedores">
                {proveedoresSugeridos.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tipo
              </label>
              <select
                value={tipoIngreso}
                onChange={(e) => setTipoIngreso(e.target.value as TipoIngreso)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
              >
                <option value="Compra">Compra</option>
                <option value="Devolución">Devolución</option>
                <option value="Ajuste">Ajuste</option>
                <option value="Stock inicial">Stock inicial</option>
              </select>
            </div>
          </div>

          {/* Comprobante */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Comprobante / Factura / Remito
            </label>
            <input
              type="text"
              value={comprobante}
              onChange={(e) => setComprobante(e.target.value)}
              placeholder="Ej: REM-00412"
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
            />
          </div>

          {errorMessage && (
            <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedInsumoId || cantidad <= 0}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Ingreso'}
          </button>
        </form>
      )}
    </div>
  );
};
