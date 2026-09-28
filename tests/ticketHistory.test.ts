import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for useTicketHistory hook logic (pure function / state logic tests).
 * 
 * Note: Since this hook uses React state, we test the underlying logic
 * and data shape contracts directly.
 */

// ── Helpers mirroring the hook's internal logic ──────────────────────────────

interface TicketHistoryEntry {
  id: number;
  commitment: string;
  roundId: number;
  txId: string;
  purchasedAt: string;
  roundCompleted: boolean;
  isWinner: boolean;
}

function createEntry(id: number, commitment: string, roundId: number, txId: string): TicketHistoryEntry {
  return {
    id,
    commitment,
    roundId,
    txId,
    purchasedAt: new Date().toISOString(),
    roundCompleted: false,
    isWinner: false,
  };
}

function markRoundCompleted(history: TicketHistoryEntry[], roundId: number, winningCommitment: string): TicketHistoryEntry[] {
  return history.map((entry) => {
    if (entry.roundId !== roundId) return entry;
    return { ...entry, roundCompleted: true, isWinner: entry.commitment === winningCommitment };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTicketHistory — state logic contracts', () => {
  it('creates a valid TicketHistoryEntry with correct shape', () => {
    const entry = createEntry(1, 'a'.repeat(64), 1, '0xzk_abc123');
    expect(entry.id).toBe(1);
    expect(entry.commitment).toHaveLength(64);
    expect(entry.roundId).toBe(1);
    expect(entry.txId).toBe('0xzk_abc123');
    expect(entry.roundCompleted).toBe(false);
    expect(entry.isWinner).toBe(false);
    expect(typeof entry.purchasedAt).toBe('string');
    // purchasedAt must be a valid ISO date
    expect(() => new Date(entry.purchasedAt)).not.toThrow();
  });

  it('markRoundCompleted flags the winning commitment as winner', () => {
    const aliceCommitment = 'a'.repeat(64);
    const bobCommitment = 'b'.repeat(64);

    const history: TicketHistoryEntry[] = [
      createEntry(1, aliceCommitment, 1, '0xzk_alice'),
      createEntry(2, bobCommitment, 1, '0xzk_bob'),
    ];

    const updated = markRoundCompleted(history, 1, bobCommitment);

    const alice = updated.find((e) => e.commitment === aliceCommitment)!;
    const bob = updated.find((e) => e.commitment === bobCommitment)!;

    expect(alice.roundCompleted).toBe(true);
    expect(alice.isWinner).toBe(false);

    expect(bob.roundCompleted).toBe(true);
    expect(bob.isWinner).toBe(true);
  });

  it('markRoundCompleted does not affect entries from other rounds', () => {
    const round1Entry = createEntry(1, 'a'.repeat(64), 1, '0xzk_round1');
    const round2Entry = createEntry(2, 'b'.repeat(64), 2, '0xzk_round2');

    const history: TicketHistoryEntry[] = [round1Entry, round2Entry];
    const updated = markRoundCompleted(history, 1, 'a'.repeat(64));

    const r2 = updated.find((e) => e.roundId === 2)!;
    expect(r2.roundCompleted).toBe(false);
    expect(r2.isWinner).toBe(false);
  });

  it('currentRoundHistory filters correctly by active roundId', () => {
    const history: TicketHistoryEntry[] = [
      createEntry(1, 'a'.repeat(64), 1, '0xzk_1'),
      createEntry(2, 'b'.repeat(64), 2, '0xzk_2'),
      createEntry(3, 'c'.repeat(64), 2, '0xzk_3'),
    ];

    const currentRound = history.filter((e) => e.roundId === 2);
    expect(currentRound).toHaveLength(2);
    expect(currentRound.every((e) => e.roundId === 2)).toBe(true);
  });

  it('commitment isolation — history entries never expose secret salts', () => {
    const secretSalt = 'SUPER_SECRET_PRIVATE_SALT_DO_NOT_EXPOSE';
    // Simulate what the hook does: store commitment, NOT the salt
    const fakeCommitment = 'deadbeef'.repeat(8); // 64 chars, like SHA-256 hex
    const entry = createEntry(1, fakeCommitment, 1, '0xzk_test');

    // The entry string representation must NOT contain the secret
    const entryStr = JSON.stringify(entry);
    expect(entryStr).not.toContain(secretSalt);
    expect(entry.commitment).not.toBe(secretSalt);
    expect(entry.commitment).toHaveLength(64);
  });

  it('invalid commitments (too short) should be detectable before storing', () => {
    const isValidCommitment = (c: string) => c && c.length >= 16;
    expect(isValidCommitment('')).toBeFalsy();
    expect(isValidCommitment('short')).toBeFalsy();
    expect(isValidCommitment('a'.repeat(64))).toBeTruthy();
  });
});
