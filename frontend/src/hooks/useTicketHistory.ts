/**
 * useTicketHistory — tracks an in-session audit trail of lottery ticket purchases.
 *
 * Privacy design:
 *  - History is held ONLY in React state (memory), never in localStorage/sessionStorage.
 *  - Secret salts are NEVER stored in history entries — only commitments (hashes).
 *  - Automatically purged on page unload.
 *  - Provides round-scoped filtering to show only current round entries.
 */
import { useState, useEffect, useCallback } from 'react';

export interface TicketHistoryEntry {
  /** Unique entry ID (incrementing counter per session) */
  id: number;
  /** SHA-256 commitment hash (safe to display) */
  commitment: string;
  /** Round this ticket belongs to */
  roundId: number;
  /** Transaction ID on Midnight chain (may be optimistic/simulated) */
  txId: string;
  /** ISO timestamp of when the ticket was purchased */
  purchasedAt: string;
  /** Whether the draw has completed for this round */
  roundCompleted: boolean;
  /** Whether this ticket won the draw */
  isWinner: boolean;
}

export interface TicketHistoryHook {
  /** Full in-session history of ticket entries */
  history: TicketHistoryEntry[];
  /** Tickets filtered to the current active round */
  currentRoundHistory: TicketHistoryEntry[];
  /** Total number of tickets purchased this session */
  totalPurchased: number;
  /** Record a new ticket purchase in the audit trail */
  recordPurchase: (commitment: string, roundId: number, txId: string) => void;
  /** Mark tickets in a given round as completed; flag winner by commitment */
  markRoundCompleted: (roundId: number, winningCommitment: string) => void;
  /** Clear the entire history (called on wallet disconnect) */
  clearHistory: () => void;
}

let _entryCounter = 0;

/**
 * Hook for maintaining an ephemeral, session-only ticket audit trail.
 * Provides transparency to users about their session activity without persisting sensitive data.
 */
export function useTicketHistory(activeRoundId: number): TicketHistoryHook {
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);

  // Purge history when the tab/window closes — no persistence
  useEffect(() => {
    const handleUnload = () => {
      setHistory([]);
      _entryCounter = 0;
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const recordPurchase = useCallback(
    (commitment: string, roundId: number, txId: string) => {
      if (!commitment || commitment.length < 16) {
        console.warn('[useTicketHistory] Skipping entry with invalid commitment.');
        return;
      }
      _entryCounter += 1;
      const entry: TicketHistoryEntry = {
        id: _entryCounter,
        commitment,
        roundId,
        txId,
        purchasedAt: new Date().toISOString(),
        roundCompleted: false,
        isWinner: false,
      };
      setHistory((prev) => [entry, ...prev]);
    },
    []
  );

  const markRoundCompleted = useCallback(
    (roundId: number, winningCommitment: string) => {
      setHistory((prev) =>
        prev.map((entry) => {
          if (entry.roundId !== roundId) return entry;
          return {
            ...entry,
            roundCompleted: true,
            isWinner: entry.commitment === winningCommitment,
          };
        })
      );
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    _entryCounter = 0;
  }, []);

  const currentRoundHistory = history.filter((e) => e.roundId === activeRoundId);

  return {
    history,
    currentRoundHistory,
    totalPurchased: history.length,
    recordPurchase,
    markRoundCompleted,
    clearHistory,
  };
}
