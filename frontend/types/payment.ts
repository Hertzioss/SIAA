export type PaymentMethod = 'transfer' | 'cash' | 'zelle' | 'pago_movil'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'overdue'
export type Currency = 'USD' | 'VES'

export interface Payment {
  id: string
  contract_id: string | null
  amount: number
  date: string
  method: PaymentMethod | null
  reference: string | null
  status: PaymentStatus
  proof_url: string | null
  notes: string | null
  created_at: string
  owner_bank_account_id: string | null
  exchange_rate: number | null
  tenant_id: string | null
  currency: Currency | null
  concept: string | null
  payment_method: string | null
  metadata: Record<string, any> | null
  billing_period: string | null
  reference_number: string | null
}

export interface PaymentInsert {
  contract_id?: string | null
  amount: number
  date: string
  method?: PaymentMethod | null
  reference?: string | null
  status?: PaymentStatus
  proof_url?: string | null
  notes?: string | null
  owner_bank_account_id?: string | null
  exchange_rate?: number | null
  tenant_id?: string | null
  currency?: Currency | null
  concept?: string | null
  payment_method?: string | null
  metadata?: Record<string, any> | null
  billing_period?: string | null
  reference_number?: string | null
  
  // Frontend only
  proof_file?: File
  sendEmail?: boolean
}

export interface PaymentWithDetails extends Payment {
  tenants?: {
    name: string
    doc_id: string
    email?: string
  }
  contracts?: {
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
