import React, { useState, useEffect, useCallback } from 'react';
import { Header, AppTab } from './components/Header';
import { SolicitarInsumo } from './components/SolicitarInsumo';
import { Dashboard } from './components/Dashboard';
import { Autorizaciones } from './components/Autorizaciones';
import { StockTable } from './components/StockTable';
import { Ingresos } from './components/Ingresos';
import { UltimosMovimientos } from './components/UltimosMovimientos';
import { PinLoginModal } from './components/PinLoginModal';
import { Administrar } from './components/Administrar';
import { AuthSession } from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('solicitar');
  const [session, setSession] = useState<AuthSession | null>(api.getSession());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  const updatePendingCount = useCallback(async () => {
    try {
      const res = await api.getSolicitudesPendientes();
      if (res.ok && res.data) {
        setPendingCount(res.data.length);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 15000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  const handleLogout = () => {
    api.clearSession();
    setSession(null);
    setActiveTab('solicitar');
  };

  const handlePinSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setActiveTab('autorizaciones');
    updatePendingCount();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        session={session}
        onLogout={handleLogout}
        onOpenPinLogin={() => setIsPinModalOpen(true)}
      />

      {/* Main Viewport */}
      <main className="flex-1 pb-12">
        {activeTab === 'solicitar' && (
          <SolicitarInsumo
            onSuccessSolicitud={updatePendingCount}
            onOpenJefeLogin={() => setIsPinModalOpen(true)}
          />
        )}

        {session && activeTab === 'dashboard' && <Dashboard />}

        {session && activeTab === 'autorizaciones' && (
          <Autorizaciones
            session={session}
            onSessionChange={(s) => setSession(s)}
            onActionComplete={updatePendingCount}
          />
        )}

        {session && activeTab === 'stock' && <StockTable />}

        {session && activeTab === 'ingresos' && (
          <Ingresos
            session={session}
            onSessionChange={(s) => setSession(s)}
            onSuccessIngreso={updatePendingCount}
          />
        )}

        {session && activeTab === 'movimientos' && <UltimosMovimientos />}
        {session && activeTab === 'administrar' && <Administrar session={session} />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto text-center">Control de Insumos · Autosol</div>
      </footer>

      {/* PIN Login Modal */}
      <PinLoginModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
      />

    </div>
  );
}
