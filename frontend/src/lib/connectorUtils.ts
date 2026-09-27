/**
 * Utility functions for Midnight DApp Connector and Lace Wallet integration
 */

/**
 * Formats a Midnight address for display (e.g., "mn_prep...4ee4" or "0x0200...191")
 */
export function formatMidnightAddress(address: string | null | undefined, prefixLen = 8, suffixLen = 6): string {
  if (!address) return '';
  if (address.length <= prefixLen + suffixLen) return address;
  return `${address.substring(0, prefixLen)}...${address.substring(address.length - suffixLen)}`;
}

/**
 * Formats micro-tNIGHT units to tNIGHT display string
 * 1 tNIGHT = 1,000,000 micro-units
 */
export function formatNightBalance(microUnits: bigint | number | string, decimals = 2): string {
  try {
    const raw = typeof microUnits === 'bigint' ? microUnits : BigInt(microUnits || 0);
    const whole = raw / 1000000n;
    const remainder = raw % 1000000n;
    const fractionStr = remainder.toString().padStart(6, '0').substring(0, decimals);
    return `${whole.toString()}.${fractionStr} tNIGHT`;
  } catch {
    return '0.00 tNIGHT';
  }
}

/**
 * Converts human-entered tNIGHT amount into micro-units (BigInt)
 */
export function parseMicroNight(amountStr: string): bigint {
  const parsed = parseFloat(amountStr);
  if (isNaN(parsed) || parsed < 0) return 0n;
  return BigInt(Math.round(parsed * 1000000));
}

/**
 * Validates whether an address matches expected Midnight testnet format
 */
export function isValidMidnightAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // Validates Midnight bech32-style (mn_preprod_...) or hex contract IDs (0x...)
  return (
    trimmed.startsWith('mn_preprod_') ||
    trimmed.startsWith('mn_preview_') ||
    (trimmed.startsWith('0x') && trimmed.length >= 40)
  );
}
