import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Wallet, ShieldCheck, AlertCircle, LogOut, Copy, Check } from 'lucide-react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const MetaMaskWallet: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [chainId, setChainId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask extension');
      return;
    }

    try {
      setError('');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      setAccount(accounts[0]);
      setChainId(network.chainId.toString());
    } catch (err: any) {
      console.error('MetaMask connection failed:', err);
      setError(err.message || 'Wallet connection failed');
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setChainId('');
    setError('');
  };

  const handleCopy = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {account && (
          <span
            className="badge badge-warning"
            style={{
              fontSize: '0.78rem',
              padding: '0.4rem 0.75rem',
              background: 'rgba(245, 158, 11, 0.08)',
              borderColor: 'rgba(245, 158, 11, 0.28)',
            }}
          >
            <ShieldCheck size={13} />
            <span>EVM Chain: {chainId}</span>
          </span>
        )}

        {account ? (
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
                borderColor: 'rgba(245, 158, 11, 0.35)',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Wallet size={11} color="#ffffff" />
              </div>

              <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.85rem' }}>
                MetaMask
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
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>

              <button
                onClick={handleCopy}
                className="btn-copy"
                title="Copy MetaMask address"
                style={{ padding: '0.25rem 0.45rem' }}
                aria-label="Copy MetaMask address"
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>

            <button
              onClick={disconnectWallet}
              className="btn btn-secondary"
              style={{
                padding: '0.55rem',
                borderRadius: '11px',
                color: 'var(--text-muted)',
              }}
              title="Disconnect MetaMask"
              aria-label="Disconnect MetaMask"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="btn btn-secondary"
            style={{
              gap: '0.5rem',
              padding: '0.62rem 1.15rem',
              fontSize: '0.88rem',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              color: '#fbbf24',
              background: 'rgba(245, 158, 11, 0.06)',
              fontWeight: 600,
            }}
          >
            <Wallet size={15} />
            <span>MetaMask (EVM)</span>
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '11px',
            padding: '0.5rem 0.85rem',
            color: '#fca5a5',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            maxWidth: '340px',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.2)',
          }}
          role="alert"
        >
          <AlertCircle size={14} style={{ flexShrink: 0, color: '#ef4444' }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
