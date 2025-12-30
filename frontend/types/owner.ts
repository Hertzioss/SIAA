export type OwnerType = 'individual' | 'company';

export interface Owner {
    id: string;
    user_id?: string | null;
    type: OwnerType;
    name: string;
    doc_id: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    created_at: string;
    beneficiaries?: OwnerBeneficiary[];
    bank_accounts?: OwnerBankAccount[]; // Joined data
    properties?: Property[]; // Joined data
}

export interface OwnerBeneficiary {
    id: string;
    owner_id: string;
    name: string;
    doc_id: string;
    participation_percentage: number;
}

export interface Property {
    id: string;
    name: string;
    address: string;
    // Add other property fields as needed
}

export interface OwnerBankAccount {
    id: string;
    owner_id: string;
    bank_name: string;
    account_number: string;
    account_type: 'ahorro' | 'corriente' | 'internacional';
    currency: 'USD' | 'VES';
    created_at: string;
}

export interface PropertyOwner {
    property_id: string;
    owner_id: string;
    percentage: number;
}
