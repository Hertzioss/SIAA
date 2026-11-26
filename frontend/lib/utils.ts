import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isBolivares(currency?: string | null): boolean {
  const normalized = (currency || '').toUpperCase().trim();
  return normalized === 'VES' || normalized === 'BS' || normalized === 'BS.';
}

export function formatCurrencyLabel(currency?: string | null): string {
  if (!currency) return 'USD';
  return isBolivares(currency) ? 'Bs' : currency;
}

export const formatCurrency = (amount: number, currency: 'USD' | 'VES' | 'Bs' | string = 'USD') => {
  if (isBolivares(currency)) {
    return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateString(dateString: string): string {
  if (!dateString) return "-";
  // Expects YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}
