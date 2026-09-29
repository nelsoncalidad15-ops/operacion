import React from 'react';
import {
  ClipboardList,
  CheckSquare,
  ArrowDownToLine,
  History,
  Lock,
  LogOut,
  Sliders,
  BarChart3,
  Layers,
  Wrench,
} from 'lucide-react';
import { AuthSession } from '../types';

export type AppTab = 'solicitar' | 'dashboard' | 'autorizaciones' | 'stock' | 'ingresos' | 'movimientos' | 'administrar';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingCount: number;
  session: AuthSession | null;
  onLogout: () => void;
  onOpenPinLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  session,
  onLogout,
  onOpenPinLogin,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('solicitar')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900">
                Control de Insumos
              </span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('solicitar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'solicitar'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Solicitar
            </button>

            {session && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => setActiveTab('autorizaciones')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative flex items-center gap-1.5 ${
                    activeTab === 'autorizaciones'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>Autorizaciones</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-500 text-slate-950 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('stock')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'stock'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Inventario
                </button>

                <button
                  onClick={() => setActiveTab('ingresos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'ingresos'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Ingresos
                </button>

                <button
                  onClick={() => setActiveTab('movimientos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'movimientos'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Historial
                </button>
                <button onClick={() => setActiveTab('administrar')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'administrar' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>Administrar</button>
              </>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {session ? (
              <button
                onClick={onLogout}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-red-600 rounded-md hover:bg-slate-100 flex items-center gap-1"
                title={`Jefatura: ${session.responsableNombre}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenPinLogin}
                className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3" />
                <span>Responsable</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {session && (
          <div className="md:hidden flex items-center gap-1 py-1.5 border-t border-slate-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('solicitar')}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
                activeTab === 'solicitar' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'
              }`}
            >
              Solicitar
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
                activeTab === 'dashboard' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('autorizaciones')}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'autorizaciones' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'
              }`}
            >
              Autorizaciones
              {pendingCount > 0 && (
                <span className="px-1 text-[9px] bg-amber-500 text-slate-950 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
                activeTab === 'stock' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'
              }`}
            >
              Inventario
            </button>
            <button
              onClick={() => setActiveTab('ingresos')}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
                activeTab === 'ingresos' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setActiveTab('movimientos')}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
                activeTab === 'movimientos' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'
              }`}
            >
              Historial
            </button>
            <button onClick={() => setActiveTab('administrar')} className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${activeTab === 'administrar' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}>Administrar</button>
          </div>
        )}
      </div>
    </header>
  );
};
