export type OwnerIncomeCategory = string;
export type OwnerIncomeStatus = 'pending' | 'received' | 'cancelled';

export interface OwnerIncome {
    id: string;
    owner_id: string;
    property_id?: string | null;
    date: string;
    amount: number;
    description: string;
    category: OwnerIncomeCategory;
    // status: OwnerIncomeStatus; // Incomes might not need status immediately, but good for future. For now, following table schema which didn't strictly ask for it, but let's check Expense. Expense has status.
    // The prompt asked for "Ingresos de otros tipos". Usually implies realized income.
    // Let's stick to the plain schema for now.
    currency: 'USD' | 'Bs' | 'VES';
    exchange_rate?: number;
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
