import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Plus,
  Minus,
  Search,
  X,
} from 'lucide-react';
import { Insumo, StockItem, Salida, Colaborador } from '../types';
import { PROVINCIAS, SECTORES } from '../data/config';
import { api } from '../services/api';

interface SolicitarInsumoProps {
  onSuccessSolicitud: () => void;
  onOpenJefeLogin?: () => void;
}

export const SolicitarInsumo: React.FC<SolicitarInsumoProps> = ({
  onSuccessSolicitud,
  onOpenJefeLogin,
}) => {
  const [provincia, setProvincia] = useState<string>('Jujuy');
  const [solicitante, setSolicitante] = useState<string>('');
  const [sector, setSector] = useState<string>('Taller');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<Salida | null>(null);

  const [colaboradoresList, setColaboradoresList] = useState<Colaborador[]>([]);
  const [recentColaboradores, setRecentColaboradores] = useState<Colaborador[]>([]);
  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputSearchRef = useRef<HTMLInputElement>(null);

  const loadData = async (prov: string) => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const [insRes, stockRes, colabRes] = await Promise.all([
        api.getInsumos(prov),
        api.getStock(prov),
        api.getColaboradores(prov),
      ]);
      if (insRes.ok && insRes.data) {
        setInsumosList(insRes.data.filter((i) => i.activo === 'Sí'));
      }
      if (stockRes.ok && stockRes.data) {
        setStockList(stockRes.data);
      }
      if (colabRes.ok && colabRes.data) {
        setColaboradoresList(colabRes.data);
      }
      const recents = api.getRecentColaboradores(prov);
      setRecentColaboradores(recents);

      if (!solicitante && recents.length > 0) {
        setSolicitante(recents[0].nombre);
        setSector(recents[0].sector);
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData(provincia);
    setSelectedInsumoId('');
    setSearchQuery('');
  }, [provincia]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const stockMap = useMemo(() => {
    const map = new Map<string, StockItem>();
    stockList.forEach((item) => {
      map.set(item.idInsumo, item);
    });
    return map;
  }, [stockList]);

  const currentInsumo = useMemo(() => {
    return insumosList.find((i) => i.id === selectedInsumoId);
  }, [insumosList, selectedInsumoId]);

  const currentStockItem = useMemo(() => {
    if (!currentInsumo) return null;
    return stockMap.get(currentInsumo.id) || null;
  }, [currentInsumo, stockMap]);

  const stockDisponible = currentStockItem ? currentStockItem.stockActual : 0;

  const filteredInsumos = useMemo(() => {
    if (!searchQuery.trim()) {
      return insumosList.slice(0, 12);
    }
    const q = searchQuery.toLowerCase();
    return insumosList.filter(
      (item) =>
        item.insumo.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
    );
  }, [insumosList, searchQuery]);

  const handleSelectInsumo = (item: Insumo) => {
    setSelectedInsumoId(item.id);
    setSearchQuery(item.insumo);
    setIsDropdownOpen(false);
    setCantidad(1);
  };

  const handleClearInsumo = () => {
    setSelectedInsumoId('');
    setSearchQuery('');
    setCantidad(1);
    if (inputSearchRef.current) {
      inputSearchRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!solicitante) {
      setErrorMessage('Seleccioná el operario.');
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
    if (cantidad > stockDisponible) {
      setErrorMessage(`Stock disponible insuficiente (${stockDisponible} ${currentInsumo.unidad}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.crearSolicitud({
        provincia,
        sector,
        idInsumo: currentInsumo.id,
        solicitante,
        cantidadSolicitada: cantidad,
      });

      if (res.ok && res.data) {
        setSuccessData(res.data);
        onSuccessSolicitud();
      } else {
        setErrorMessage(res.message || 'Error al enviar solicitud.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setSelectedInsumoId('');
    setSearchQuery('');
    setCantidad(1);
    setErrorMessage(null);
    loadData(provincia);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 sm:py-6 min-h-[calc(100dvh-7rem)] flex items-center">
      {successData ? (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-7 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Solicitud Registrada
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Queda pendiente de autorización por jefatura.
          </p>

          <div className="my-5 p-3.5 bg-slate-50 rounded-lg text-xs space-y-2 text-left border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Operario:</span>
              <span className="font-semibold text-slate-800">{successData.solicitante} ({successData.sector})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Insumo:</span>
              <span className="font-semibold text-slate-900">{successData.insumo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cantidad:</span>
              <span className="font-bold text-slate-900 font-mono">
                {successData.cantidadSolicitada} {currentInsumo?.unidad}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Nueva Solicitud
          </button>
        </div>
      ) : (
        <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Retiro de Insumos
              </h1>
              <p className="text-sm text-slate-500">
                Seleccioná operario, insumo y cantidad requerida.
              </p>
            </div>

            {/* Base */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {PROVINCIAS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvincia(p)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    provincia === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Operario & Sector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Operario
                </label>
                <select
                  value={solicitante}
                  onChange={(e) => {
                    setSolicitante(e.target.value);
                    const colab = colaboradoresList.find((c) => c.nombre === e.target.value);
                    if (colab) setSector(colab.sector);
                  }}
                  className="w-full text-base py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {colaboradoresList.map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Sector
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full text-base py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                  required
                >
                  {SECTORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Insumo Search */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700">
                  Insumo
                </label>
                {currentInsumo && (
                  <span className="text-[11px] font-mono text-slate-500">
                    Stock: <strong className="text-slate-900">{stockDisponible} {currentInsumo.unidad}</strong>
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  ref={inputSearchRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    if (selectedInsumoId && e.target.value !== currentInsumo?.insumo) {
                      setSelectedInsumoId('');
                    }
                  }}
                  placeholder="Buscar insumo..."
                  className="w-full text-base py-2.5 pl-3 pr-9 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                />
                {selectedInsumoId ? (
                  <button
                    type="button"
                    onClick={handleClearInsumo}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                )}
              </div>

              {/* Autocomplete list */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-md z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {isLoadingData ? (
                    <div className="p-3 text-center text-xs text-slate-400">Cargando...</div>
                  ) : filteredInsumos.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">Sin resultados</div>
                  ) : (
                    filteredInsumos.map((item) => {
                      const st = stockMap.get(item.id);
                      const disp = st ? st.stockActual : 0;
                      const sinStock = disp <= 0;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={sinStock}
                          onClick={() => handleSelectInsumo(item)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            sinStock ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        >
                          <div>
                            <span className="font-medium text-slate-800">{item.insumo}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">{item.categoria}</span>
                          </div>
                          <span className={`font-mono text-xs ${sinStock ? 'text-red-500' : 'text-slate-600'}`}>
                            {disp} {item.unidad}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cantidad
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                    disabled={cantidad <= 1}
                    className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={stockDisponible || 1}
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-center font-mono font-medium text-xs py-1.5 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCantidad((prev) => Math.min(stockDisponible || 1, prev + 1))}
                    disabled={cantidad >= stockDisponible || stockDisponible <= 0}
                    className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {currentInsumo && (
                  <span className="text-xs text-slate-500 font-mono">
                    {currentInsumo.unidad}
                  </span>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedInsumoId || stockDisponible <= 0}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isSubmitting ? 'Enviando...' : 'Solicitar Insumo'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {onOpenJefeLogin && (
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Supervisión</span>
              <button
                type="button"
                onClick={onOpenJefeLogin}
                className="text-slate-800 hover:underline font-medium"
              >
                Ingreso del responsable →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
