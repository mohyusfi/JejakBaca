import { describe, expect, it } from 'vitest';
import {
  formatAuthors,
  formatDateId,
  formatLoanDueLabel,
  formatLoanQuota,
  getStockSummary,
} from '../format';

describe('format helpers', () => {
  it('mengklasifikasikan status stok aman, menipis (<=1), dan habis', () => {
    expect(getStockSummary(4, 5)).toEqual({
      health: 'available',
      label: 'Tersedia',
      ratioText: '4/5 tersedia',
    });

    expect(getStockSummary(1, 3)).toEqual({
      health: 'low',
      label: 'Stok Menipis',
      ratioText: '1/3 tersedia',
    });

    expect(getStockSummary(0, 2)).toEqual({
      health: 'empty',
      label: 'Stok Habis',
      ratioText: '0/2 tersedia',
    });
  });

  it('memformat label jatuh tempo dan Terlambat tanpa istilah denda', () => {
    expect(
      formatLoanDueLabel({
        status: 'borrowed',
        isOverdue: false,
        daysRemaining: 4,
        returnedAt: null,
      }),
    ).toBe('4 hari lagi');

    expect(
      formatLoanDueLabel({
        status: 'borrowed',
        isOverdue: false,
        daysRemaining: 0,
        returnedAt: null,
      }),
    ).toBe('Jatuh tempo hari ini');

    const overdueLabel = formatLoanDueLabel({
      status: 'borrowed',
      isOverdue: true,
      daysRemaining: -3,
      returnedAt: null,
    });
    expect(overdueLabel).toBe('Terlambat 3 hari');
    expect(overdueLabel.toLowerCase()).not.toContain('denda');

    expect(
      formatLoanDueLabel({
        status: 'returned',
        isOverdue: false,
        daysRemaining: 0,
        returnedAt: '2026-11-10T08:00:00.000Z',
      }),
    ).toContain('Dikembalikan');
  });

  it('memformat penulis, tanggal, dan kuota pinjaman', () => {
    expect(formatAuthors(['Robert C. Martin'])).toBe('Robert C. Martin');
    expect(formatAuthors([])).toBe('Penulis tidak diketahui');
    expect(formatDateId(null)).toBe('-');
    expect(formatLoanQuota(2, 3)).toBe('2/3 aktif');
  });
});
