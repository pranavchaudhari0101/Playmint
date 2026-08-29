import { describe, expect, it } from 'vitest';
import {
  SPARKS_PER_RUPEE,
  formatPaise,
  formatSparks,
  sparksAsPaise,
  sparksWithCashValue,
  lineSparkCap,
  isSparksOnly,
  slidableMax,
  shortfall,
  normalizeCartSparks,
} from '@/lib/money';

describe('economy constants', () => {
  it('locks 100 Sparks = ₹1', () => {
    expect(SPARKS_PER_RUPEE).toBe(100);
  });
});

describe('formatPaise', () => {
  it('formats whole rupees without decimals', () => {
    expect(formatPaise(99900)).toBe('₹999');
  });

  it('formats sub-rupee amounts with decimals', () => {
    expect(formatPaise(2940)).toBe('₹29.40');
    expect(formatPaise(50)).toBe('₹0.50');
  });

  it('uses Indian digit grouping', () => {
    expect(formatPaise(199800)).toContain('1,998');
  });

  it('formats zero', () => {
    expect(formatPaise(0)).toBe('₹0');
  });
});

describe('formatSparks', () => {
  it('groups thousands with Indian locale', () => {
    expect(formatSparks(29900)).toBe('29,900');
    expect(formatSparks(7450)).toBe('7,450');
  });
});

describe('sparksAsPaise / sparksWithCashValue', () => {
  it('converts Sparks 1:1 to paise — never /10', () => {
    expect(sparksAsPaise(7000)).toBe(7000);
    expect(sparksAsPaise(2940)).toBe(2940);
  });

  it('renders combined label', () => {
    expect(sparksWithCashValue(5000)).toContain('5,000 Sparks');
    expect(sparksWithCashValue(5000)).toContain('₹50');
  });
});

describe('lineSparkCap — mirrors backend computeLine', () => {
  it('caps hybrid lines at maxSparks when below line cash', () => {
    // Pulse Buds: ₹999 (=99900 paise), maxSparks 7000 → cap 7000
    expect(lineSparkCap({ cashPricePaise: 99900, maxSparks: 7000 }, 1)).toBe(7000);
    expect(lineSparkCap({ cashPricePaise: 99900, maxSparks: 7000 }, 2)).toBe(14000);
  });

  it('caps hybrid lines at line cash when maxSparks would exceed it', () => {
    // Socks-as-hybrid: ₹40 (=4000 paise), maxSparks 34900 → cap 4000
    expect(lineSparkCap({ cashPricePaise: 4000, maxSparks: 34900 }, 1)).toBe(4000);
    // qty 2 doubles both, cap stays at cash
    expect(lineSparkCap({ cashPricePaise: 4000, maxSparks: 34900 }, 2)).toBe(8000);
  });

  it('returns exact price for Sparks-only products', () => {
    expect(lineSparkCap({ cashPricePaise: 0, maxSparks: 29900 }, 1)).toBe(29900);
    expect(lineSparkCap({ cashPricePaise: 0, maxSparks: 29900 }, 3)).toBe(89700);
  });
});

describe('isSparksOnly', () => {
  it('keys off zero cash price', () => {
    expect(isSparksOnly({ cashPricePaise: 0 })).toBe(true);
    expect(isSparksOnly({ cashPricePaise: 100 })).toBe(false);
  });
});

describe('slidableMax', () => {
  it('bounds the slider by wallet balance', () => {
    expect(slidableMax({ cashPricePaise: 99900, maxSparks: 7000 }, 1, 5000)).toBe(5000);
    expect(slidingCaseFullBalance());
  });

  function slidingCaseFullBalance() {
    // wallet above cap → slider max is the cap
    const max = slidableMax({ cashPricePaise: 99900, maxSparks: 7000 }, 1, 50000);
    expect(max).toBe(7000);
    return true;
  }

  it('never goes negative', () => {
    expect(slidableMax({ cashPricePaise: 99900, maxSparks: 7000 }, 1, 0)).toBe(0);
  });
});

describe('shortfall', () => {
  it('clamps at zero', () => {
    expect(shortfall(7000, 2940)).toBe(4060);
    expect(shortfall(7000, 9000)).toBe(0);
  });
});

describe('normalizeCartSparks — the rule CartContext applies', () => {
  const hybrid = { cashPricePaise: 99900, maxSparks: 7000 };
  const sparksOnly = { cashPricePaise: 0, maxSparks: 29900 };

  it('defaults hybrid adds to the full eligible cap', () => {
    expect(normalizeCartSparks(hybrid, 1, lineSparkCap(hybrid, 1))).toBe(7000);
  });

  it('forces Sparks-only lines to the exact required amount regardless of desired', () => {
    expect(normalizeCartSparks(sparksOnly, 1, 0)).toBe(29900);
    expect(normalizeCartSparks(sparksOnly, 1, 100)).toBe(29900);
    expect(normalizeCartSparks(sparksOnly, 2, 999999)).toBe(59800);
  });

  it('clamps hybrid allocations into [0, cap]', () => {
    expect(normalizeCartSparks(hybrid, 1, -50)).toBe(0);
    expect(normalizeCartSparks(hybrid, 1, 5000)).toBe(5000);
    expect(normalizeCartSparks(hybrid, 2, 999999)).toBe(14000);
  });

  it('rescales with qty so a stored allocation stays valid', () => {
    // player had 6900 of cap 7000 at qty 1 → qty 3 cap is 21000, 6900 stays
    expect(normalizeCartSparks(hybrid, 3, 6900)).toBe(6900);
  });
});
