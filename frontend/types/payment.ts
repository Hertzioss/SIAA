export interface Payment {
  id: string
  created_at: string
  contract_id: string
  tenant_id: string
  amount: number
  currency: 'USD' | 'VES'
  exchange_rate?: number
  concept: string
  payment_method: string
  reference_number: string
  date: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  notes?: string
  proof_url?: string
  owner_bank_account_id?: string
  metadata?: Record<string, unknown>
  billing_period?: string
}

export interface PaymentInsert {
    contract_id: string
    tenant_id: string
    date: string
    amount: number
    currency: 'USD' | 'VES'
    exchange_rate?: number
    concept: string
    payment_method: string
    reference_number: string
    notes?: string
    proof_file?: File
    owner_bank_account_id?: string
    metadata?: Record<string, unknown>
    status?: 'pending' | 'approved' | 'rejected' | 'paid'
    billing_period: string
    sendEmail?: boolean
}

export interface PaymentWithDetails extends Payment {
  tenants: {
    name: string
    doc_id: string
  }
  contracts: {
    units: {
      name: string
      properties: {
        name: string
        property_owners: {
          owners: {
            name: string
            doc_id: string
          }
        }[]
      }
    }
  }
}

export interface MonthlyBalance {
    rentAmount: number
    paidAmount: number
    pendingPayments: number
    totalCovered: number
    remainingDebt: number
    isPartial: boolean
    isCompete: boolean
}
