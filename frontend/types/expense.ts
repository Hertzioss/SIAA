export type ExpenseCategory = 'maintenance' | 'utilities' | 'tax' | 'other';
export type ExpenseStatus = 'pending' | 'paid' | 'cancelled';

export interface Expense {
    id: string;
    property_id: string;
    unit_id?: string | null;
    category: ExpenseCategory;
    description?: string | null;
    amount: number;
    currency?: 'USD' | 'Bs';
    exchange_rate?: number;
    date: string;
    status: ExpenseStatus;
    receipt_url?: string | null;
    created_at: string;
    updated_at: string;
    // Relations
    property?: {
        id: string;
        name: string;
    };
    unit?: {
        id: string;
        name: string;
    } | null;
}
