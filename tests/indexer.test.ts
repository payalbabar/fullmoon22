import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLiveIndexerState } from '../frontend/src/indexer.js';

describe('Midnight Indexer Client Tests', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('correctly maps valid GraphQL response to ContractIndexerState', async () => {
    const mockState = {
      round_id: 2,
      pot_balance: '5000000',
      ticket_count: 5,
      ticket_price: '1000000',
      winning_index: 3,
      winning_commitment: 'a'.repeat(64),
      is_completed: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          contract: {
            address: '0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191',
            state: mockState,
          },
        },
      }),
    } as any);

    const result = await fetchLiveIndexerState('0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191', 'https://indexer.preprod.midnight.network');
    
    expect(result.round_id).toBe(2);
    expect(result.pot_balance).toBe(5000000n);
    expect(result.ticket_count).toBe(5);
    expect(result.ticket_price).toBe(1000000n);
    expect(result.winning_index).toBe(3);
    expect(result.winning_commitment).toBe('a'.repeat(64));
    expect(result.is_completed).toBe(true);
    expect(typeof result.lastUpdated).toBe('string');
  });

  it('throws descriptive error on non-ok HTTP status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as any);

    await expect(
      fetchLiveIndexerState('0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191', 'https://indexer.preprod.midnight.network')
    ).rejects.toThrow('Indexer GraphQL query failed with status 503');
  });

  it('throws descriptive error on GraphQL error payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Contract address not found in indexer' }],
      }),
    } as any);

    await expect(
      fetchLiveIndexerState('0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191', 'https://indexer.preprod.midnight.network')
    ).rejects.toThrow('GraphQL Error: Contract address not found in indexer');
  });
});
