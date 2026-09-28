export interface ContractIndexerState {
  contractAddress: string;
  round_id: number;
  pot_balance: bigint;
  ticket_count: number;
  ticket_price: bigint;
  winning_index: number;
  winning_commitment: string;
  is_completed: boolean;
  lastUpdated: string;
}

/**
 * Options for fetchLiveIndexerState retries and timeout.
 */
export interface IndexerFetchOptions {
  /** Number of retry attempts on transient failure (default: 2) */
  retries?: number;
  /** Per-attempt timeout in milliseconds (default: 8000) */
  timeoutMs?: number;
}

/**
 * Fetches the live on-chain contract state from the Midnight Preprod Indexer
 * via a GraphQL query. Includes configurable retry logic and per-attempt timeouts
 * to handle transient indexer unavailability gracefully.
 *
 * @param contractAddress - The Midnight contract address (hex or bech32)
 * @param indexerUrl - GraphQL endpoint of the Midnight indexer
 * @param options - Optional retry and timeout configuration
 */
export async function fetchLiveIndexerState(
  contractAddress: string,
  indexerUrl: string = (import.meta as any)?.env?.VITE_INDEXER_URL || 'http://localhost:8088',
  options: IndexerFetchOptions = {}
): Promise<ContractIndexerState> {
  const { retries = 2, timeoutMs = 8000 } = options;

  const query = `
    query GetContractState($address: String!) {
      contract(address: $address) {
        address
        state {
          round_id
          pot_balance
          ticket_count
          ticket_price
          winning_index
          winning_commitment
          is_completed
        }
      }
    }
  `;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(indexerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { address: contractAddress },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        throw new Error(`Indexer GraphQL query failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL Error: ${result.errors[0].message}`);
      }

      if (result.data && result.data.contract && result.data.contract.state) {
        const s = result.data.contract.state;
        return {
          contractAddress,
          round_id: Number(s.round_id || 1),
          pot_balance: BigInt(s.pot_balance || 0),
          ticket_count: Number(s.ticket_count || 0),
          ticket_price: BigInt(s.ticket_price || 1000000),
          winning_index: Number(s.winning_index || 0),
          winning_commitment: s.winning_commitment || '0'.repeat(64),
          is_completed: Boolean(s.is_completed),
          lastUpdated: new Date().toLocaleTimeString(),
        };
      }

      throw new Error('Contract state not initialized or indexed yet');
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      lastError = err;

      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isRetryable =
        isAbort ||
        (err instanceof Error &&
          (err.message.includes('fetch') ||
           err.message.includes('network') ||
           err.message.includes('Failed to fetch')));

      // Non-retryable errors (e.g. GraphQL errors, non-ok status): throw immediately
      if (!isRetryable) throw err;

      // Retryable: wait with exponential back-off before next attempt
      if (attempt < retries) {
        const backoffMs = 300 * Math.pow(2, attempt); // 300ms, 600ms, ...
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}
