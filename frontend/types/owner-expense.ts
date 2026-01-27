export type OwnerExpenseCategory = 'withdrawal' | 'tax' | 'fee' | 'maintenance' | 'other';
export type OwnerExpenseStatus = 'pending' | 'paid' | 'cancelled';

export interface OwnerExpense {
    id: string;
    owner_id: string;
    property_id?: string | null;
    date: string;
    amount: number;
    description: string;
    category: OwnerExpenseCategory;
    status: OwnerExpenseStatus;
    currency: 'USD' | 'Bs';
    exchange_rate?: number;
    receipt_url?: string | null;
    created_at: string;
    // Relations
    owner?: {
        id: string;
        name: string;
        doc_id: string;
    };
    property?: {
        id: string;
        name: string;
    } | null;
}
