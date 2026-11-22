import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus digunakan di dalam ToastProvider.');
  }
  return ctx;
}
