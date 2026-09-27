import { describe, it, expect } from 'vitest';
import {
  formatMidnightAddress,
  formatNightBalance,
  parseMicroNight,
  isValidMidnightAddress,
} from '../frontend/src/lib/connectorUtils.js';

describe('Lace DApp Connector & Midnight Utility Tests', () => {
  describe('formatMidnightAddress', () => {
    it('truncates standard Preprod user address with ellipsis', () => {
      const addr = 'mn_preprod_1cead884688b14f4a0bd0741b8554ee4e79e0fb';
      expect(formatMidnightAddress(addr, 10, 6)).toBe('mn_preprod...9e0fb');
    });

    it('returns empty string on null or undefined input', () => {
      expect(formatMidnightAddress(null)).toBe('');
      expect(formatMidnightAddress(undefined)).toBe('');
    });

    it('returns original string if length is shorter than prefix + suffix', () => {
      expect(formatMidnightAddress('short', 10, 6)).toBe('short');
    });
  });

  describe('formatNightBalance', () => {
    it('formats 1,000,000 micro-units to 1.00 tNIGHT', () => {
      expect(formatNightBalance(1000000n)).toBe('1.00 tNIGHT');
    });

    it('formats arbitrary micro-units with decimal precision', () => {
      expect(formatNightBalance(2500000n, 2)).toBe('2.50 tNIGHT');
      expect(formatNightBalance(500000n, 2)).toBe('0.50 tNIGHT');
    });

    it('handles zero and invalid balance inputs safely', () => {
      expect(formatNightBalance(0n)).toBe('0.00 tNIGHT');
      expect(formatNightBalance('invalid' as any)).toBe('0.00 tNIGHT');
    });
  });

  describe('parseMicroNight', () => {
    it('converts decimal tNIGHT strings to bigint micro-units', () => {
      expect(parseMicroNight('1.5')).toBe(1500000n);
      expect(parseMicroNight('10')).toBe(10000000n);
    });

    it('returns 0n on invalid inputs', () => {
      expect(parseMicroNight('abc')).toBe(0n);
      expect(parseMicroNight('-5')).toBe(0n);
    });
  });

  describe('isValidMidnightAddress', () => {
    it('identifies valid Midnight Preprod address formats', () => {
      expect(isValidMidnightAddress('mn_preprod_1cead884688b14f4a0bd0741b8554ee4e79e0fb')).toBe(true);
      expect(isValidMidnightAddress('0x02003b516506eba484031a1388f7631708d066d6c23cb8d36f8c88cfb191')).toBe(true);
    });

    it('rejects malformed or empty addresses', () => {
      expect(isValidMidnightAddress('')).toBe(false);
      expect(isValidMidnightAddress('0x123')).toBe(false);
      expect(isValidMidnightAddress('invalid_address_format')).toBe(false);
    });
  });
});
