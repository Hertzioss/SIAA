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
  const datePart = dateString.split('T')[0].split(' ')[0];
  const [year, month, day] = datePart.split('-').map(Number);
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

/**
 * Formatea el concepto de pago para recibos, correos y reportes:
 * - Reemplaza "Renta" por "Canon".
 * - Oculta "(Completo)" para mostrar un concepto limpio.
 * - Sustituye "(Parcial)" o "(Parte)" por un asterisco "*" discreto.
 */
export function formatPaymentConcept(concept?: string | null): string {
  if (!concept) return "";
  return concept
    .replace(/Renta/gi, "Canon")
    .replace(/\s*\(\s*completo\s*\)/gi, "")
    .replace(/\s*\(\s*(?:parcial|parte)\s*\)/gi, " *")
    .replace(/\s{2,}/g, " ")
    .trim();
}
