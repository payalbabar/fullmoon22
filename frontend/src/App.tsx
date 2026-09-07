import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMidnight } from './hooks/useMidnight';
import { WalletConnect } from './components/WalletConnect';
import { MetaMaskWallet } from './components/MetaMaskWallet';
import { LotteryView } from './components/LotteryView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingModal } from './components/OnboardingModal';
import { FeedbackWidget } from './components/FeedbackWidget';
import { Shield, BookOpen, Lock, Sparkles } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10000,
    },
  },
});

function AppInner() {
  const midnight = useMidnight();

  const openOnboarding = () => {
    window.dispatchEvent(new Event('open-onboarding'));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-container">
        {/* First-time user onboarding — auto-shows, skippable */}
        <OnboardingModal />

        {/* ─── Top Trust Ribbon ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            padding: '0.45rem 1rem',
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={12} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Zero-Knowledge Protection:</span>
            <span>All entries verified via Compact ZK-SNARK circuits without revealing private salts.</span>
          </div>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={12} color="var(--accent-amber)" />
            <span style={{ color: 'var(--accent-purple-light)' }}>Midnight Preprod Live Testnet</span>
          </div>
        </div>

        {/* ─── Header ─── */}
        <header className="header-nav">
          <div className="brand">
            <div className="brand-icon">
              <Shield size={24} color="#ffffff" />
            </div>
            <div>
              <div className="brand-title">Midnight Privacy Lottery</div>
              <div className="brand-sub">
                <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                <span>COMPACT CONTRACT · MIDNIGHT PREPROD</span>
              </div>
            </div>
          </div>

          <div
            className="header-wallet-group"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
          >
            {/* Guide button */}
            <button
              onClick={openOnboarding}
              className="btn btn-secondary"
              style={{
                gap: '0.45rem',
                padding: '0.58rem 1rem',
                fontSize: '0.85rem',
                borderRadius: '12px',
              }}
              title="Open How It Works guide"
              aria-label="Open How It Works guide"
            >
              <BookOpen size={15} color="var(--accent-cyan)" />
              <span>Guide</span>
            </button>

            <MetaMaskWallet />
            <WalletConnect
              isConnected={midnight.isConnected}
              walletName={midnight.walletName}
              address={midnight.address}
              network={midnight.network}
              isConnecting={midnight.isConnecting}
              error={midnight.error}
              availableWallets={midnight.availableWallets}
              onConnect={midnight.connectWallet}
              onDisconnect={midnight.disconnectWallet}
              onClearError={midnight.clearError}
            />
          </div>
        </header>

        {/* ─── Main Content ─── */}
        <main>
          <LotteryView
            isConnected={midnight.isConnected}
            address={midnight.address}
            walletApi={midnight.api}
          />
        </main>

        {/* ─── Footer ─── */}
        <footer
          style={{
            marginTop: '4.5rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '9px',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  <Shield size={15} color="#ffffff" />
                </div>
                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                  Midnight Privacy Lottery
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Built for{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>
                  INTO the Midnight — SPPU Bootcamp
                </strong>{' '}
                (Rise In)
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.55rem',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  marginBottom: '0.5rem',
                }}
              >
                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                  Midnight Network Preprod
                </span>
                <span className="badge badge-privacy" style={{ fontSize: '0.75rem' }}>
                  Compact v0.14
                </span>
                <span className="badge badge-preview" style={{ fontSize: '0.75rem' }}>
                  DApp Connector API v4
                </span>
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Connected via Lace Wallet DApp Connector & Live Midnight Preprod Indexer
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating feedback widget — always accessible */}
      <FeedbackWidget />
    </QueryClientProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

export default App;
