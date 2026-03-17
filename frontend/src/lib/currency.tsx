'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';

const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  JPY: '¥',
};

const CURRENCY_LOCALES: Record<string, string> = {
  THB: 'th-TH',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
};

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  refreshSettings: () => Promise<void>;
  formatCurrency: (value: number) => string;
  formatCurrencyShort: (value: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState('THB');

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.get<{ default_currency: string }>('/settings');
      if (data?.default_currency) {
        setCurrency(data.default_currency);
      }
    } catch {
      // Keep default if settings fetch fails
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const formatCurrencyFn = useCallback(
    (value: number) => {
      const locale = CURRENCY_LOCALES[currency] || 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    },
    [currency],
  );

  const formatCurrencyShort = useCallback(
    (value: number) => {
      const sym = CURRENCY_SYMBOLS[currency] || currency;
      if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K`;
      return `${sym}${value.toFixed(0)}`;
    },
    [currency],
  );

  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      refreshSettings,
      formatCurrency: formatCurrencyFn,
      formatCurrencyShort,
      symbol,
    }),
    [currency, refreshSettings, formatCurrencyFn, formatCurrencyShort, symbol],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}

/**
 * Standalone currency formatter for non-component contexts (e.g. chart tick formatters).
 */
export function formatCurrencyStatic(value: number, currency: string = 'THB'): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K`;
  return `${sym}${value.toFixed(0)}`;
}
