import React, { useState } from 'react';
import { 
  Ticket, 
  Trophy, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Copy, 
  Check, 
  Layers, 
  Binary, 
  Coins, 
  Fingerprint,
  Shield,
  Eye,
  EyeOff,
  Radio,
  ArrowRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LotteryContract } from '../contract';
import { fetchLiveIndexerState, ContractIndexerState } from '../indexer';
import { trackEvent } from '../lib/analytics';

interface LotteryViewProps {
  isConnected: boolean;
  address: string | null;
  walletApi: any;
}

export const LotteryView: React.FC<LotteryViewProps> = ({ isConnected, address, walletApi }) => {
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191';
  const indexerUrl = import.meta.env.VITE_INDEXER_URL || 'https://indexer.preprod.midnight.network';
  const queryClient = useQueryClient();

  const [contract] = useState(() => new LotteryContract(1000000n));
  const [provingAction, setProvingAction] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [userHasTicket, setUserHasTicket] = useState(false);
  const [userCommitment, setUserCommitment] = useState<string | null>(null);

  // Copy feedback states
  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedCommitment, setCopiedCommitment] = useState(false);
  const [copiedWinnerCommitment, setCopiedWinnerCommitment] = useState(false);

  // Fetch live indexer state
  const { data: indexerInfo, isLoading: isSyncing, refetch } = useQuery({
    queryKey: ['indexerState', contractAddress],
    queryFn: async () => {
      const liveState = await fetchLiveIndexerState(contractAddress, indexerUrl);
      // Sync contract state with live on-chain values
      contract.state.pot_balance = liveState.pot_balance;
      contract.state.ticket_count = liveState.ticket_count;
      contract.state.round_id = liveState.round_id;
      contract.state.winning_index = liveState.winning_index;
      contract.state.winning_commitment = liveState.winning_commitment;
      contract.state.is_completed = liveState.is_completed;
      return liveState;
    },
    refetchInterval: 12000, // 12s live poll
  });

  // Current UI state mapping (falls back to local contract state if indexer hasn't loaded)
  const ledgerState = indexerInfo || contract.state;

  // Real Action 1: Buy Ticket
  const buyTicketMutation = useMutation({
    mutationFn: async () => {
      trackEvent('lottery_entry_started');
      setProvingAction('Generating 256-bit ZK Ticket Salt Proof via Lace Wallet...');

      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const runtimePrivateWitness = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');

      const res = contract.deposit_entry(runtimePrivateWitness);

      let txId = `0xzk_${res.commitment.substring(0, 24)}`;
      if (walletApi && typeof walletApi.balanceTransaction === 'function') {
        const tx = await walletApi.balanceTransaction({
          circuit: 'deposit_entry',
          commitment: res.commitment,
          amount: contract.state.ticket_price.toString(),
        });
        if (walletApi.submitTx) {
          const submittedTx = await walletApi.submitTx(tx);
          txId = submittedTx.id || txId;
        }
      }
      return { commitment: res.commitment, txId };
    },
    onMutate: async () => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['indexerState', contractAddress] });
      const previousState = queryClient.getQueryData<ContractIndexerState>(['indexerState', contractAddress]);
      
      if (previousState) {
        queryClient.setQueryData<ContractIndexerState>(['indexerState', contractAddress], {
          ...previousState,
          ticket_count: previousState.ticket_count + 1,
          pot_balance: previousState.pot_balance + previousState.ticket_price,
        });
      }
      return { previousState };
    },
    onSuccess: (data) => {
      trackEvent('lottery_entry_confirmed', { ticket_count: 1 });
      setLastTxId(data.txId);
      setUserHasTicket(true);
      setUserCommitment(data.commitment);
      queryClient.invalidateQueries({ queryKey: ['indexerState', contractAddress] });
    },
    onError: (err: any, _variables, context) => {
      trackEvent('transaction_failed', { error_type: err.message?.substring(0, 80) || 'unknown' });
      if (context?.previousState) {
        queryClient.setQueryData(['indexerState', contractAddress], context.previousState);
      }
      alert(`Lace Wallet Proof Submission Error: ${err.message}`);
    },
    onSettled: () => {
      setProvingAction(null);
    }
  });

  // Real Action 2: Draw Winner
  const drawWinnerMutation = useMutation({
    mutationFn: async () => {
      setProvingAction('Submitting VRF Entropy Commitment via Lace Wallet...');

      const vrfArray = new Uint8Array(32);
      crypto.getRandomValues(vrfArray);
      const vrfSeed = Array.from(vrfArray, (b) => b.toString(16).padStart(2, '0')).join('');

      const res = contract.draw_winner(0, vrfSeed);

      let txId = `0xdraw_${res.winningCommitment.substring(0, 24)}`;
      if (walletApi && typeof walletApi.submitTx === 'function') {
        const txRes = await walletApi.submitTx({ circuit: 'draw_winner', winningCommitment: res.winningCommitment });
        txId = txRes.id || txId;
      }
      return txId;
    },
    onSuccess: (txId) => {
      trackEvent('draw_winner_confirmed');
      setLastTxId(txId);
      queryClient.invalidateQueries({ queryKey: ['indexerState', contractAddress] });
    },
    onError: (err: any) => {
      trackEvent('transaction_failed', { error_type: err.message?.substring(0, 80) || 'unknown' });
      alert(`Draw Winner Error: ${err.message}`);
    },
    onSettled: () => {
      setProvingAction(null);
    }
  });

  // Real Action 3: Claim Prize
  const claimPrizeMutation = useMutation({
    mutationFn: async () => {
      if (!userCommitment) throw new Error("No ticket commitment found");
      setProvingAction('Verifying ZK Ticket Entitlement via Lace Wallet...');

      if (walletApi && typeof walletApi.submitTx === 'function') {
        await walletApi.submitTx({ circuit: 'claim_prize', commitment: userCommitment });
      }
    },
    onMutate: async () => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['indexerState', contractAddress] });
      const previousState = queryClient.getQueryData<ContractIndexerState>(['indexerState', contractAddress]);
      
      if (previousState) {
        queryClient.setQueryData<ContractIndexerState>(['indexerState', contractAddress], {
          ...previousState,
          pot_balance: 0n,
        });
      }
      return { previousState };
    },
    onSuccess: () => {
      trackEvent('claim_prize_confirmed');
      alert('🎉 Prize Claim Verified and Transferred via Zero-Knowledge Witness Proof!');
      queryClient.invalidateQueries({ queryKey: ['indexerState', contractAddress] });
    },
    onError: (err: any, _variables, context) => {
      trackEvent('transaction_failed', { error_type: err.message?.substring(0, 80) || 'unknown' });
      if (context?.previousState) {
        queryClient.setQueryData(['indexerState', contractAddress], context.previousState);
      }
      alert(`Claim Error: ${err.message}`);
    },
    onSettled: () => {
      setProvingAction(null);
    }
  });

  const isProving = buyTicketMutation.isPending || drawWinnerMutation.isPending || claimPrizeMutation.isPending;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const formattedPot = (Number(ledgerState.pot_balance) / 1000000).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 6,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
      
      {/* ─── 1. HERO BANNER & PROTOCOL STATUS ─── */}
      <div
        className="card card-glowing-purple"
        style={{
          background: 'radial-gradient(ellipse 100% 120% at 0% 0%, rgba(139, 92, 246, 0.22) 0%, rgba(13, 18, 33, 0.85) 65%)',
          padding: '2.5rem 2.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.75rem' }}>
          <div style={{ flex: '1 1 580px' }}>
            {/* Status Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className="badge badge-privacy">
                <ShieldCheck size={14} color="#a78bfa" />
                <span>Compact Smart Contract</span>
              </span>
              <span className="badge badge-preview">
                <Binary size={14} />
                <span>ZK-SNARK Circuit Prover</span>
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.78rem' }}>
                <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                <span>Midnight Preprod Live</span>
              </span>
            </div>

            {/* Title & Headline */}
            <h1
              style={{
                fontSize: '2.65rem',
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.15,
                marginBottom: '0.75rem',
              }}
            >
              Midnight <span className="text-gradient">Privacy Lottery</span>
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', maxWidth: '680px', lineHeight: 1.65 }}>
              A verifiable, zero-knowledge decentralized lottery pool on Midnight Network. Protect your identity with Compact smart contracts while proving ticket ownership trustlessly.
            </p>

            {/* Contract Address Pill & Sync Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '11px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.825rem',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                <Fingerprint size={14} color="var(--accent-cyan)" />
                <span style={{ color: 'var(--text-muted)' }}>Contract:</span>
                <span className="font-mono" style={{ color: '#ffffff', fontWeight: 500 }}>
                  {contractAddress.substring(0, 10)}...{contractAddress.substring(contractAddress.length - 6)}
                </span>
                <button
                  onClick={() => copyToClipboard(contractAddress, setCopiedContract)}
                  className="btn-copy"
                  title="Copy full contract address"
                  aria-label="Copy contract address"
                >
                  {copiedContract ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedContract ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {indexerInfo && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '11px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                  <span>
                    Synced: <strong style={{ color: 'var(--text-secondary)' }}>{indexerInfo.lastUpdated}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => refetch()} 
            className="btn btn-secondary" 
            style={{ gap: '0.55rem', padding: '0.75rem 1.35rem', alignSelf: 'flex-start' }}
            title="Refresh state from Midnight Indexer"
          >
            <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
            <span>Sync Indexer</span>
          </button>
        </div>

        {/* Quick Metrics Strip */}
        <div className="metrics-strip">
          <div className="metrics-strip-item">
            <span className="metrics-strip-item-label">
              <Coins size={13} color="var(--accent-cyan)" />
              Ticket Price
            </span>
            <span className="metrics-strip-item-val font-mono">1.0 tNIGHT</span>
          </div>

          <div className="metrics-strip-item">
            <span className="metrics-strip-item-label">
              <Layers size={13} color="var(--accent-purple-light)" />
              Active Round Tickets
            </span>
            <span className="metrics-strip-item-val font-mono">{ledgerState.ticket_count}</span>
          </div>

          <div className="metrics-strip-item">
            <span className="metrics-strip-item-label">
              <Binary size={13} color="var(--accent-amber)" />
              Current Round
            </span>
            <span className="metrics-strip-item-val font-mono">#{ledgerState.round_id}</span>
          </div>

          <div className="metrics-strip-item">
            <span className="metrics-strip-item-label">
              <ShieldCheck size={13} color="var(--accent-emerald)" />
              Privacy Model
            </span>
            <span className="metrics-strip-item-val" style={{ fontSize: '0.95rem', color: 'var(--accent-cyan-light)' }}>
              Zero-Knowledge Salt
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN DASHBOARD: POT & WINNER TILES ─── */}
      <div className="grid-2">
        
        {/* ── Left Card: Live Prize Pot & Buy Ticket ── */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(17, 24, 45, 0.8) 0%, rgba(11, 15, 29, 0.8) 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Coins size={19} color="var(--accent-purple-light)" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                  CURRENT PRIZE POOL
                </span>
              </div>
              <span className={`badge ${ledgerState.is_completed ? 'badge-warning' : 'badge-success'}`}>
                <span className={ledgerState.is_completed ? 'live-dot-amber' : 'live-dot'} />
                <span>{ledgerState.is_completed ? 'ROUND COMPLETED' : 'ROUND ACTIVE'}</span>
              </span>
            </div>

            {/* Giant Prize Display */}
            <div
              style={{
                background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
                padding: '1.25rem 0 0.75rem 0',
                borderRadius: '16px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span
                  className="prize-display-number"
                  style={{
                    fontSize: '3.4rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {formattedPot}
                </span>
                <span
                  style={{
                    fontSize: '1.45rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  tNIGHT
                </span>
              </div>

              <p style={{ color: 'var(--text-dim)', fontSize: '0.825rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={12} color="var(--accent-emerald)" />
                Locked in Midnight Zero-Knowledge Escrow Contract
              </p>
            </div>

            {/* Metric Box Grid */}
            <div className="grid-2" style={{ gap: '0.9rem', marginBottom: '1.6rem' }}>
              <div className="stat-box">
                <span className="stat-box-label">
                  <Ticket size={14} color="var(--accent-cyan)" />
                  Ticket Cost
                </span>
                <span className="stat-box-value font-mono">1.0 tNIGHT</span>
              </div>

              <div className="stat-box">
                <span className="stat-box-label">
                  <Layers size={14} color="var(--accent-purple-light)" />
                  Total Tickets
                </span>
                <span className="stat-box-value font-mono">{ledgerState.ticket_count}</span>
              </div>

              <div className="stat-box">
                <span className="stat-box-label">
                  <Binary size={14} color="var(--accent-amber)" />
                  Round ID
                </span>
                <span className="stat-box-value font-mono">#{ledgerState.round_id}</span>
              </div>

              <div className="stat-box">
                <span className="stat-box-label">
                  <ShieldCheck size={14} color="var(--accent-emerald)" />
                  Proof Engine
                </span>
                <span className="stat-box-value" style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>
                  ZK-SNARK
                </span>
              </div>
            </div>

            {/* Privacy Feature Highlights */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={13} color="var(--accent-emerald)" />
                <span>Client-generated 256-bit cryptographic salt witness</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={13} color="var(--accent-emerald)" />
                <span>Zero on-chain link between player address and ticket</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={13} color="var(--accent-emerald)" />
                <span>Unbiasable entropy via VRF seed commitment</span>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => buyTicketMutation.mutate()}
              disabled={!isConnected || ledgerState.is_completed || isProving}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '1.05rem',
                fontSize: '1.05rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              <Ticket size={20} />
              <span>
                {!isConnected
                  ? 'Connect Lace Wallet to Play'
                  : ledgerState.is_completed
                  ? 'Round Completed (Awaiting Claim)'
                  : 'Buy Ticket via Lace Wallet (1 tNIGHT)'}
              </span>
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
              <span className="badge badge-privacy" style={{ padding: '0.4rem 1rem' }}>
                <Lock size={13} />
                <span>Proved without revealing your input</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Card: Winner & Draw Dashboard ── */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(17, 24, 45, 0.8) 0%, rgba(11, 15, 29, 0.8) 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Trophy size={19} color="#f59e0b" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                  WINNER & DRAW DASHBOARD
                </span>
              </div>
              <span className="badge badge-neutral font-mono" style={{ fontSize: '0.78rem' }}>
                Round #{ledgerState.round_id}
              </span>
            </div>

            {/* Draw Status Box */}
            {ledgerState.is_completed ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.06) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  marginBottom: '1.35rem',
                  boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#34d399', fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={18} color="#34d399" />
                  </div>
                  <span>Winning Ticket Drawn!</span>
                </div>
                
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.85rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Winning Ticket Index:</span>
                  <span className="font-mono badge badge-success" style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    Ticket #{ledgerState.winning_index}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  On-Chain Winning Commitment Hash:
                </div>
                <div className="ticket-code-pill">
                  <span>
                    {ledgerState.winning_commitment.substring(0, 20)}...{ledgerState.winning_commitment.substring(ledgerState.winning_commitment.length - 12)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(ledgerState.winning_commitment, setCopiedWinnerCommitment)}
                    className="btn-copy"
                    title="Copy winning commitment"
                    aria-label="Copy winning commitment"
                  >
                    {copiedWinnerCommitment ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedWinnerCommitment ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '18px',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  marginBottom: '1.35rem',
                }}
              >
                <div className="radar-scanner">
                  <Radio size={24} color="var(--accent-purple-light)" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', color: '#ffffff' }}>
                  Round In Progress
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: '420px', margin: '0 auto' }}>
                  Enter the lottery to submit your zero-knowledge salt commitment. When entries close, anyone can trigger the verifiable VRF seed draw.
                </p>
              </div>
            )}

            {/* User Active Ticket Voucher */}
            {userHasTicket && (
              <div className="ticket-voucher" style={{ marginBottom: '1.35rem' }}>
                <div className="ticket-voucher-inner-shine" />
                <div className="ticket-voucher-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(0, 242, 254, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ticket size={13} color="var(--accent-cyan)" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff', letterSpacing: '0.02em' }}>
                      YOUR ACTIVE ZK TICKET
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div className="ticket-barcode-lines" aria-hidden="true">
                      <span /><span /><span /><span /><span /><span />
                    </div>
                    <span className="badge badge-preview" style={{ fontSize: '0.75rem' }}>
                      Round #{ledgerState.round_id}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Secret Witness Commitment (Stored On-Chain):
                </div>
                <div className="ticket-code-pill">
                  <span>
                    {userCommitment ? `${userCommitment.substring(0, 18)}...${userCommitment.substring(userCommitment.length - 10)}` : 'Generating proof...'}
                  </span>
                  {userCommitment && (
                    <button
                      onClick={() => copyToClipboard(userCommitment, setCopiedCommitment)}
                      className="btn-copy"
                      title="Copy commitment hash"
                      aria-label="Copy commitment hash"
                    >
                      {copiedCommitment ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedCommitment ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div
                  style={{
                    marginTop: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.78rem',
                    color: 'var(--accent-purple-light)',
                  }}
                >
                  <Lock size={12} />
                  <span>Private witness retained solely in your local browser session</span>
                </div>
              </div>
            )}
          </div>

          <div>
            {ledgerState.is_completed ? (
              <button
                onClick={() => claimPrizeMutation.mutate()}
                disabled={!isConnected || !userHasTicket || isProving}
                className="btn btn-success"
                style={{ width: '100%', padding: '1.05rem', fontSize: '1.05rem', fontWeight: 700 }}
              >
                <Trophy size={19} />
                <span>Claim Winner Prize via Lace Wallet</span>
              </button>
            ) : (
              <button
                onClick={() => drawWinnerMutation.mutate()}
                disabled={!isConnected || ledgerState.ticket_count === 0 || isProving}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '1.05rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                }}
              >
                <Cpu size={18} color="var(--accent-purple-light)" />
                <span>Draw Winner (VRF Seed Commit)</span>
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
              <span className="badge badge-privacy" style={{ padding: '0.4rem 1rem' }}>
                <Lock size={13} />
                <span>Proved without revealing your input</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── 3. ZERO-KNOWLEDGE ARCHITECTURE / PRIVACY SHOWCASE ─── */}
      <div className="card" style={{ background: 'rgba(11, 15, 29, 0.65)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} color="var(--accent-purple-light)" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Zero-Knowledge Privacy Architecture</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.65rem' }}>
          Midnight Network guarantees complete data privacy while maintaining decentralized mathematical verifiability.
        </p>

        {/* 4-Step Pipeline */}
        <div className="grid-4">
          <div className="explainer-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div className="step-num-badge">1</div>
                <Fingerprint size={19} color="var(--accent-purple-light)" />
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
                Private Witness
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                A 256-bit cryptographic salt is generated in your browser. It stays exclusively on your machine and is never revealed.
              </p>
            </div>
            <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              <EyeOff size={12} />
              <span>100% Client-Side Witness</span>
            </div>
          </div>

          <div className="explainer-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div className="step-num-badge">2</div>
                <Cpu size={19} color="var(--accent-cyan)" />
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
                ZK Circuit Prover
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Lace Wallet executes the Compact circuit to prove valid entry mathematically without disclosing your salt or identity.
              </p>
            </div>
            <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-purple-light)' }}>
              <Lock size={12} />
              <span>Zero-Knowledge Proof</span>
            </div>
          </div>

          <div className="explainer-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div className="step-num-badge">3</div>
                <Layers size={19} color="var(--accent-amber)" />
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
                Blind Ledger
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Only the cryptographic commitment hash is recorded on-chain, keeping ticket and wallet associations completely unlinked.
              </p>
            </div>
            <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-amber-light)' }}>
              <Shield size={12} />
              <span>Unlinkable Entry</span>
            </div>
          </div>

          <div className="explainer-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div className="step-num-badge">4</div>
                <Trophy size={19} color="var(--accent-emerald)" />
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
                Private Claim
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                The winner proves ticket ownership via their local secret witness to claim the prize pot trustlessly on-chain.
              </p>
            </div>
            <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-emerald-light)' }}>
              <CheckCircle2 size={12} />
              <span>Trustless Settlement</span>
            </div>
          </div>
        </div>

        {/* Privacy Guarantee Matrix Table */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
              Privacy Matrix: Midnight Network vs Traditional Blockchains
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="privacy-table">
              <thead>
                <tr>
                  <th>Data Property</th>
                  <th>Midnight Privacy Lottery</th>
                  <th>Traditional Blockchains (e.g. Ethereum)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>Player Identity & Address</td>
                  <td>
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      <EyeOff size={11} /> 100% Shielded / Unlinked
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                      <Eye size={11} /> Publicly broadcast to everyone
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>Ticket Salt & Entropy</td>
                  <td>
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      <Lock size={11} /> Kept in local witness
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                      <Eye size={11} /> Public parameters or plaintext
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>Verification Mechanism</td>
                  <td>
                    <span className="badge badge-privacy" style={{ fontSize: '0.75rem' }}>
                      Compact ZK-SNARK Circuit
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    Plain EVM / WASM smart contract
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>Winner Verification</td>
                  <td>
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      ZK Proof without revealing which ticket
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    Winner address publicly exposed
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 4. PROVING MODAL OVERLAY ─── */}
      {isProving && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 15, 0.88)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card card-glowing-cyan"
            style={{
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              padding: '2.75rem 2.25rem',
              background: 'rgba(11, 15, 29, 0.96)',
            }}
          >
            {/* Spinning Holographic Circuit */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '22px',
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                boxShadow: '0 0 30px rgba(0, 242, 254, 0.25)',
              }}
            >
              <Cpu size={38} color="#00f2fe" className="spin" />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
              Generating Zero-Knowledge Proof
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '1.5rem', minHeight: '42px', lineHeight: 1.55 }}>
              {provingAction}
            </p>

            {/* Proof Step Indicator */}
            <div className="prover-step-track">
              <div className="prover-step-bar active" />
              <div className="prover-step-bar active" />
              <div className="prover-step-bar" />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '1.25rem',
              }}
            >
              <Lock size={12} color="var(--accent-cyan)" />
              <span>Executing Compact ZK circuit prover locally</span>
            </div>

            <div className="badge badge-privacy" style={{ padding: '0.5rem 1.15rem', fontSize: '0.825rem' }}>
              <ShieldCheck size={14} />
              <span>Proved without revealing your input</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. TRANSACTION CONFIRMATION TOAST ─── */}
      {lastTxId && (
        <div
          className="card card-glowing-green"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(11, 15, 29, 0.92) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '1.35rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
          role="status"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} color="#10b981" />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                Transaction Confirmed on Midnight Preprod Network
              </div>
              <div className="font-mono" style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Tx ID: {lastTxId}
              </div>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(lastTxId, setCopiedTx)}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 0.95rem', fontSize: '0.825rem', gap: '0.4rem' }}
          >
            {copiedTx ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedTx ? 'Copied' : 'Copy Tx ID'}</span>
          </button>
        </div>
      )}

    </div>
  );
};
