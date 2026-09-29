import React, { useState, useEffect } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { Salida, AuthSession, StockItem } from '../types';
import { api } from '../services/api';
import { PROVINCIAS } from '../data/config';

interface AutorizacionesProps {
  session: AuthSession | null;
  onSessionChange: (session: AuthSession | null) => void;
  onActionComplete: () => void;
}

export const Autorizaciones: React.FC<AutorizacionesProps> = ({
  session,
  onSessionChange,
  onActionComplete,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isValidatingPin, setIsValidatingPin] = useState<boolean>(false);

  const [solicitudes, setSolicitudes] = useState<Salida[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, StockItem>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendientes = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [salRes, stockRes] = await Promise.all([
        api.getSolicitudesPendientes(provinciaFiltro || undefined),
        api.getStock(provinciaFiltro || undefined),
      ]);

      if (salRes.ok && salRes.data) {
        setSolicitudes(salRes.data);
      }

      if (stockRes.ok && stockRes.data) {
        const map = new Map<string, StockItem>();
        stockRes.data.forEach((s) => {
          map.set(s.idInsumo + '_' + s.provincia.toLowerCase(), s);
        });
        setStockMap(map);
      }
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadPendientes();
    }
  }, [session, provinciaFiltro]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsValidatingPin(true);

    try {
      const res = await api.validarPin(pinInput);
      if (res.ok && res.data) {
        onSessionChange(res.data);
        setPinInput('');
      } else {
        setPinError(res.message || 'PIN incorrecto.');
      }
    } catch {
      setPinError('Error al validar PIN.');
    } finally {
      setIsValidatingPin(false);
    }
  };

  const handleAutorizar = async (sol: Salida) => {
    if (!session) return;
    setProcessingId(sol.idSolicitud);
    try {
      const res = await api.autorizarSalida(sol.idSolicitud, sol.cantidadSolicitada, session.token);
      if (res.ok) {
        setSolicitudes((prev) => prev.filter((s) => s.idSolicitud !== sol.idSolicitud));
        onActionComplete();
      } else {
        alert(res.message || 'Error al autorizar.');
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRechazar = async (sol: Salida) => {
    if (!session) return;
    const motivo = prompt('Motivo del rechazo (opcional):') || '';
    setProcessingId(sol.idSolicitud);
    try {
      const res = await api.rechazarSolicitud(sol.idSolicitud, motivo, session.token);
      if (res.ok) {
        setSolicitudes((prev) => prev.filter((s) => s.idSolicitud !== sol.idSolicitud));
        onActionComplete();
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!session) {
    return (
      <div className="max-w-sm mx-auto py-12 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Autorizaciones
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Ingresá tu PIN para autorizar salidas.
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
              disabled={isValidatingPin || !pinInput}
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
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Solicitudes Pendientes
          </h1>
          <span className="text-xs text-slate-500">
            {solicitudes.length} para autorizar · {session.responsableNombre}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={provinciaFiltro}
            onChange={(e) => setProvinciaFiltro(e.target.value)}
            className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
          >
            <option value="">Todas las bases</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={loadPendientes}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* List */}
      {solicitudes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700">
            No hay solicitudes pendientes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {solicitudes.map((sol) => {
            const keyStock = sol.idInsumo + '_' + sol.provincia.toLowerCase();
            const stockItem = stockMap.get(keyStock);
            const stockActual = stockItem ? stockItem.stockActual : 0;
            const unidad = stockItem ? stockItem.unidad : 'u.';
            const isInsufficient = stockActual < sol.cantidadSolicitada;
            const isBusy = processingId === sol.idSolicitud;

            return (
              <div
                key={sol.idSolicitud}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">
                      {sol.solicitante}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      · {sol.sector} ({sol.provincia})
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      · {sol.fechaHoraSolicitud.split(' ')[1] || sol.fechaHoraSolicitud}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {sol.insumo}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {sol.cantidadSolicitada} {unidad}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-500 font-mono">
                    Stock actual: <strong className="text-slate-700">{stockActual} {unidad}</strong>
                    {isInsufficient && (
                      <span className="text-red-500 font-semibold ml-2">Insuficiente</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleRechazar(sol)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-red-600 rounded-lg hover:bg-slate-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || isInsufficient}
                    onClick={() => handleAutorizar(sol)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Autorizar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
