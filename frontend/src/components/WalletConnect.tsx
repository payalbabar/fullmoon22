import React, { useState } from 'react';
import { Wallet, ShieldCheck, AlertCircle, LogOut, Loader2, Zap, Copy, Check } from 'lucide-react';
import { WalletInfo } from '../hooks/useMidnight';

interface WalletConnectProps {
  isConnected: boolean;
  walletName: string | null;
  address: string | null;
  network: string;
  isConnecting: boolean;
  error: string | null;
  availableWallets: WalletInfo[];
  onConnect: (walletId?: string) => void;
  onDisconnect: () => void;
  onClearError: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  walletName,
  address,
  network,
  isConnecting,
  error,
  availableWallets,
  onConnect,
  onDisconnect,
  onClearError,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        {/* Network Badge */}
        <span
          className="badge badge-preview"
          style={{
            fontSize: '0.78rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(0, 242, 254, 0.08)',
            borderColor: 'rgba(0, 242, 254, 0.28)',
          }}
          title="Midnight Network Environment"
        >
          <span className="live-dot" style={{ width: '6px', height: '6px' }} />
          <span>{network ? network.toUpperCase() : 'PREPROD'}</span>
        </span>

        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              className="card"
              style={{
                padding: '0.42rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                background: 'rgba(15, 22, 38, 0.9)',
                borderColor: 'rgba(139, 92, 246, 0.35)',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #00f2fe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={11} color="#ffffff" />
              </div>

              <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>
                {walletName || 'Lace Wallet'}
              </span>

              <span
                className="font-mono"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ''}
              </span>

              <button
                onClick={handleCopy}
                className="btn-copy"
                title="Copy Lace wallet address"
                style={{ padding: '0.25rem 0.45rem' }}
                aria-label="Copy Lace address"
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>

            <button
              onClick={onDisconnect}
              className="btn btn-secondary"
              style={{
                padding: '0.55rem',
                borderRadius: '11px',
                color: 'var(--text-muted)',
              }}
              title="Disconnect Lace Wallet"
              aria-label="Disconnect Lace Wallet"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onConnect()}
            disabled={isConnecting}
            className="btn btn-primary"
            style={{
              gap: '0.55rem',
              padding: '0.62rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {isConnecting ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />}
            <span>{isConnecting ? 'Connecting Lace...' : 'Connect Lace Wallet'}</span>
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '11px',
            padding: '0.55rem 0.85rem',
            color: '#fca5a5',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            maxWidth: '380px',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.2)',
          }}
          role="alert"
        >
          <AlertCircle size={14} style={{ flexShrink: 0, color: '#ef4444' }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>{error}</span>
          <button
            onClick={onClearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '0 0.2rem',
            }}
            title="Dismiss error"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
