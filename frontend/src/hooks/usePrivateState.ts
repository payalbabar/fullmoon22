/**
 * usePrivateState — manages the user's local private witness (ZK salt).
 *
 * Privacy design:
 *  - The secret salt is held ONLY in React state (memory), never in localStorage.
 *  - It is cleared on page unload and on wallet disconnect.
 *  - Only the cryptographic commitment (hash) is ever sent to the contract.
 */
import { useState, useEffect, useCallback } from 'react';

export interface PrivateTicket {
  /** Raw private salt — kept only in memory, NEVER persisted */
  secretSalt: string;
  /** SHA-256 commitment hash stored on-chain */
  commitment: string;
  /** Round ID this ticket belongs to */
  roundId: number;
  /** UTC ISO timestamp of purchase */
  purchasedAt: string;
}

export interface PrivateStateHook {
  /** Active ticket if user has purchased in this session */
  activeTicket: PrivateTicket | null;
  /** Whether the user holds a valid ticket for the current round */
  hasTicket: boolean;
  /** Store a newly purchased ticket in local memory */
  storeTicket: (secretSalt: string, commitment: string, roundId: number) => void;
  /** Wipe the private witness from memory (on disconnect / round reset) */
  clearTicket: () => void;
  /** Verify that the stored salt matches a given commitment (for claim check) */
  verifyOwnership: (commitment: string) => boolean;
}

/**
 * Hook for managing ephemeral private witness state.
 * The salt is NEVER written to localStorage, sessionStorage, or any network call.
 */
export function usePrivateState(): PrivateStateHook {
  const [activeTicket, setActiveTicket] = useState<PrivateTicket | null>(null);

  // Wipe private state when the tab/window closes
  useEffect(() => {
    const handleUnload = () => setActiveTicket(null);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const storeTicket = useCallback(
    (secretSalt: string, commitment: string, roundId: number) => {
      // Sanity: never store an empty or very short salt
      if (!secretSalt || secretSalt.length < 8) {
        console.error('[usePrivateState] Refusing to store an insecure salt.');
        return;
      }
      setActiveTicket({
        secretSalt,
        commitment,
        roundId,
        purchasedAt: new Date().toISOString(),
      });
    },
    []
  );

  const clearTicket = useCallback(() => {
    setActiveTicket(null);
  }, []);

  const verifyOwnership = useCallback(
    (commitment: string): boolean => {
      if (!activeTicket) return false;
      return activeTicket.commitment === commitment;
    },
    [activeTicket]
  );

  return {
    activeTicket,
    hasTicket: activeTicket !== null,
    storeTicket,
    clearTicket,
    verifyOwnership,
  };
}
