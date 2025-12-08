export type TenantStatus = 'solvent' | 'delinquent';

export interface Tenant {
    id: string;
    name: string;
    doc_id: string;
    email?: string | null;
    phone?: string | null;
    birth_date?: string | null;
    status: TenantStatus;
    created_at?: string;
}
