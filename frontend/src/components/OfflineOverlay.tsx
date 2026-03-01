import { ReactNode } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineOverlayProps {
  children: ReactNode;
}

export function OfflineOverlay({ children }: OfflineOverlayProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-6">
      <div className="bg-[#0d1420]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-bold text-white mb-2">Kein Internet</h1>
        <p className="text-gray-400 text-sm mb-6">
          Dieses Spiel erfordert eine aktive Internetverbindung.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-colors"
        >
          Seite neu laden
        </button>
      </div>
    </div>
  );
}
