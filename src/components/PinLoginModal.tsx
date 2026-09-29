import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { AuthSession } from '../types';
import { api } from '../services/api';

interface PinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export const PinLoginModal: React.FC<PinLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.validarPin(pin.trim());
      if (res.ok && res.data) {
        onSuccess(res.data);
        setPin('');
        onClose();
      } else {
        setError(res.message || 'PIN incorrecto.');
      }
    } catch {
      setError('Error al validar PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xs w-full p-5 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Acceso del responsable
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ingresá tu PIN de responsable
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full text-center tracking-[0.3em] font-mono text-2xl py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400"
            autoFocus
          />

          {error && (
            <div className="p-1.5 bg-red-50 text-red-600 text-[11px] rounded text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
          >
            {loading ? 'Validando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  );
};
