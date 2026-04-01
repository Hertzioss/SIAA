import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, parseISO, isValid } from 'date-fns'

// Types based on the components requirements
export interface IncomeExpenseData {
    dataUsd: any[]
    dataBs: any[]
    dataExpenses: any[]
    dataDistribution: any[]
}

export interface OperationalData {
    occupancy: any[]
    delinquency: any[]
    maintenance?: any[]
    performance?: any[]
}

export function useReports() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchIncomeExpense = useCallback(async (months: string[], year: string, properties: string[]) => {
        setIsLoading(true)
        setError(null)
        try {
            const monthMap: Record<string, number> = {
                'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3, 'MAYO': 4, 'JUNIO': 5,
                'JULIO': 6, 'AGOSTO': 7, 'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11
            }

            // Calculate Date Range based on selected months
            // If no months selected, maybe default to whole year or error? Let's assume at least one.
            if (months.length === 0) {
                toast.warning('Debe seleccionar al menos un mes.')
                setIsLoading(false)
                return null
            }

            const selectedIndices = months.map(m => monthMap[m.toUpperCase()]).filter(i => i !== undefined).sort((a, b) => a - b)
            const minIndex = selectedIndices[0]
            const maxIndex = selectedIndices[selectedIndices.length - 1]

            const startDate = new Date(parseInt(year), minIndex, 1).toISOString().split('T')[0]
            const endDate = new Date(parseInt(year), maxIndex + 1, 0).toISOString().split('T')[0]

            // 1. Fetch Payments (Simplified query to avoid deep joins)
            let paymentsQuery = supabase
                .from('payments')
                .select(`
                    id, amount, date, status, currency, concept, exchange_rate, contract_id, tenant_id,
                    tenants(name)
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .in('status', ['paid', 'approved']) 

            const { data: rawPaymentsData, error: paymentsError } = await paymentsQuery
            if (paymentsError) throw paymentsError

            // 2. Fetch Contract Details in Batch
            const contractIds = Array.from(new Set(rawPaymentsData?.map((p: any) => p.contract_id).filter(Boolean)))
            const contractsMap: Record<string, any> = {}

            if (contractIds.length > 0) {
                const { data: contractsData, error: contractsError } = await supabase
                    .from('contracts')
                    .select(`
                        id,
                        units (
                            id,
                            properties (
                                id,
                                name
                            )
                        )
                    `)
                    .in('id', contractIds)

                if (contractsError) throw contractsError

                contractsData?.forEach((c: any) => {
                    const unit = Array.isArray(c.units) ? c.units[0] : c.units
                    const property = Array.isArray(unit?.properties) ? unit?.properties[0] : unit?.properties
                    contractsMap[c.id] = {
                        property_id: property?.id,
                        property_name: property?.name
                    }
                })
            }

            // 3. Merge Payments with Contract/Property info
            const paymentsData = rawPaymentsData.map((p: any) => {
                const contractInfo = contractsMap[p.contract_id || '']
                return {
                    ...p,
                    contracts: {
                        units: {
                            properties: {
                                id: contractInfo?.property_id,
                                name: contractInfo?.property_name
                            }
                        },
                        tenants: {
                            name: Array.isArray(p.tenants) ? p.tenants[0]?.name : p.tenants?.name
                        }
                    }
                }
            })

            // 4. Fetch Expenses
            let expensesQuery = supabase
                .from('expenses')
                .select(`
                    *,
                    properties (
                        id,
                        name
                    )
                `)
                .gte('date', startDate)
                .lte('date', endDate)

            const { data: expensesData, error: expensesError } = await expensesQuery
            if (expensesError) throw expensesError

            // Helper to check if a date falls within the selected specific months
            const isDateInSelectedMonths = (dateStr: string) => {
                const monthPart = parseInt(dateStr.split('-')[1]) - 1 // 0-11
                return selectedIndices.includes(monthPart)
            }

            // Filter by properties AND specific months
            const filteredPayments = paymentsData.filter((p: any) => {
                const pId = p.contracts?.units?.properties?.id
                const matchProperty = properties.length > 0 ? properties.includes(pId) : true
                const matchMonth = isDateInSelectedMonths(p.date)
                return matchProperty && matchMonth
            })

            const filteredExpenses = expensesData.filter((e: any) => {
                const matchProperty = properties.length > 0 ? properties.includes(e.property_id) : true
                const matchMonth = isDateInSelectedMonths(e.date)
                return matchProperty && matchMonth
            })

            // Transform Data - Split by Currency
            const dataUsd = filteredPayments
                .filter((p: any) => p.currency === 'USD')
                .map((p: any) => ({
                    date: p.date && isValid(parseISO(p.date)) ? format(parseISO(p.date), 'dd/MM/yyyy') : p.date,
                    tenantName: p.contracts?.tenants?.name || 'Desconocido',
                    concept: p.concept,
                    credit: p.amount,
                    debit: 0,
                    balance: p.amount // Placeholder for balance
                }))

            const dataBs = filteredPayments
                .filter((p: any) => p.currency === 'VES')
                .map((p: any) => {
                    const rate = p.exchange_rate || 0
                    const incomeUsd = rate > 0 ? (p.amount / rate) : 0
                    return {
                        date: p.date && isValid(parseISO(p.date)) ? format(parseISO(p.date), 'dd/MM/yyyy') : p.date,
                        tenantName: p.contracts?.tenants?.name || 'Desconocido',
                        concept: p.concept,
                        credit: p.amount, // This is in VES
                        debit: 0,
                        balance: p.amount, // in VES
                        rate: rate,
                        incomeUsd: incomeUsd,
                        balanceUsd: incomeUsd // in USD
                    }
                })

            const dataExpenses = filteredExpenses.map((e: any) => ({
                date: e.date && isValid(parseISO(e.date)) ? format(parseISO(e.date), 'dd/MM/yyyy') : e.date,
                category: e.category,
                description: e.description,
                amount: e.amount,
                status: e.status
            }))

            // 3. Fetch Owners and Property Relationships
            const { data: ownersData, error: ownersError } = await supabase
                .from('property_owners')
                .select(`
                    percentage,
                    property_id,
                    owner:owners (
                        id,
                        name
                    )
                `)

            if (ownersError) throw ownersError

            // Calculate Net Income calculation per property to distribute correctly
            // We need to group payments and expenses by property
            const propertyFinancials: Record<string, { income: number, expense: number, net: number }> = {}

            // Process Income
            filteredPayments.forEach((p: any) => {
                const pid = p.contracts?.units?.properties?.id
                if (!pid) return

                if (!propertyFinancials[pid]) propertyFinancials[pid] = { income: 0, expense: 0, net: 0 }

                let amountUsd = p.amount
                if (p.currency === 'VES') {
                    const rate = p.exchange_rate || 0
                    amountUsd = rate > 0 ? (p.amount / rate) : 0
                }
                propertyFinancials[pid].income += amountUsd
            })

            // Process Expenses
            filteredExpenses.forEach((e: any) => {
                const pid = e.property_id
                if (!pid) return
                if (!propertyFinancials[pid]) propertyFinancials[pid] = { income: 0, expense: 0, net: 0 }

                propertyFinancials[pid].expense += e.amount
            })

            // Calculate Net for each property
            Object.keys(propertyFinancials).forEach(pid => {
                propertyFinancials[pid].net = propertyFinancials[pid].income - propertyFinancials[pid].expense
            })

            // Distribute to owners
            const ownerShares: Record<string, { name: string, amount: number }> = {}
            let totalNetIncome = 0

            // Filter property owners by the selected properties (if filtering is active)
            const relevantPropertyOwners = properties.length > 0
                ? ownersData.filter((po: any) => properties.includes(po.property_id))
                : ownersData

            // We iterate over the financial records of properties that are relevant
            Object.keys(propertyFinancials).forEach(pid => {
                // If filter is active and this property is not in it, skip (though filteredPayments should handle this)
                if (properties.length > 0 && !properties.includes(pid)) return

                const net = propertyFinancials[pid].net
                totalNetIncome += net

                // Find owners for this property
                const propsOwners = relevantPropertyOwners.filter((po: any) => po.property_id === pid)

                propsOwners.forEach((po: any) => {
                    const ownerName = po.owner?.name || 'Desconocido'
                    const share = net * (po.percentage / 100)

                    if (!ownerShares[ownerName]) {
                        ownerShares[ownerName] = { name: ownerName, amount: 0 }
                    }
                    ownerShares[ownerName].amount += share
                })
            })

            // Transform to distribution array with effective percentage
            const dataDistribution = Object.values(ownerShares).map(share => ({
                owner: share.name, // Component expects 'owner'
                amount: share.amount,
                percentage: totalNetIncome !== 0 ? (share.amount / totalNetIncome) * 100 : 0
            }))

            return {
                dataUsd,
                dataBs,
                dataExpenses,
                dataDistribution
            }

        } catch (err: any) {
            console.error('Error fetching income/expense:', err)
            toast.error('Error al generar reporte financiero')
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchOccupancy = useCallback(async (properties: string[]) => {
        setIsLoading(true)
        try {
            // 1. Fetch units with property name
            const { data: unitsData, error } = await supabase
                .from('units')
                .select(`*, properties(id, name)`)

            if (error) throw error

            const filtered = properties.length > 0
                ? unitsData.filter((u: any) => properties.includes(u.property_id))
                : unitsData

            // 2. Batch fetch active contracts for these units
            const unitIds = filtered.map((u: any) => u.id)
            const contractsMap: Record<string, any> = {}

            if (unitIds.length > 0) {
                const { data: contractsData } = await supabase
                    .from('contracts')
                    .select(`
                        id, unit_id, status, rent_amount,
                        tenants(name, doc_id, phone, email)
                    `)
                    .in('unit_id', unitIds)
                    .eq('status', 'active')

                contractsData?.forEach((c: any) => {
                    contractsMap[c.unit_id] = c
                })
            }

            return filtered.map((u: any) => {
                const activeContract = contractsMap[u.id]
                const tenant = Array.isArray(activeContract?.tenants) ? activeContract.tenants[0] : activeContract?.tenants
                
                return {
                    property: u.properties?.name || 'Desconocida',
                    unit: u.name,
                    status: u.status === 'occupied' ? 'Ocupado' : 'Vacante',
                    tenant: u.status === 'occupied' ? (tenant?.name || 'Sin Asignar') : '-',
                    docId: u.status === 'occupied' ? (tenant?.doc_id || '-') : '-',
                    phone: u.status === 'occupied' ? (tenant?.phone || '-') : '-',
                    email: u.status === 'occupied' ? (tenant?.email || '-') : '-',
                    rent: u.status === 'occupied' ? (activeContract?.rent_amount || 0) : 0
                }
            })
        } catch (err: any) {
            console.error('Error fetching occupancy:', err)
            toast.error('Error al generar reporte de ocupación')
            return []
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchDelinquency = useCallback(async (properties: string[]) => {
        setIsLoading(true)
        try {
            // 1. Fetch all tenants with active contracts
            const { data: contractsData, error: contractsError } = await supabase
                .from('contracts')
                .select(`
                    id, tenant_id, rent_amount, start_date, end_date,
                    tenants (id, name, status, doc_id),
                    units (
                        name, property_id,
                        properties(id, name)
                    )
                `)
                .eq('status', 'active')

            if (contractsError) throw contractsError
            if (!contractsData || contractsData.length === 0) return []

            // 2. Fetch all approved/paid payments for these contracts
            const contractIds = contractsData.map((c: any) => c.id)
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('contract_id, amount, status')
                .in('contract_id', contractIds)
                .in('status', ['approved', 'paid'])

            if (paymentsError) throw paymentsError

            // Group payments by contract
            const paymentsMap: Record<string, number> = {}
            paymentsData?.forEach((p: any) => {
                if (!paymentsMap[p.contract_id]) paymentsMap[p.contract_id] = 0
                paymentsMap[p.contract_id]++
            })

            const now = new Date()
            const reportData = contractsData.map((c: any) => {
                const tenant = Array.isArray(c.tenants) ? c.tenants[0] : c.tenants
                const unit = Array.isArray(c.units) ? c.units[0] : c.units
                const property = Array.isArray(unit?.properties) ? unit.properties[0] : unit?.properties
                
                // Calculate months since start
                if (!c.start_date) return null
                const startDate = new Date(c.start_date)
                
                // Validate date is realistic (not in the distant past/future due to typos)
                if (isNaN(startDate.getTime()) || startDate.getFullYear() < 1900) return null

                const monthDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
                
                // +1 because if started this month, it's already due 1 month
                const expectedMonths = Math.max(0, monthDiff + 1)
                
                const paidMonths = paymentsMap[c.id] || 0
                const debtMonths = Math.max(0, expectedMonths - paidMonths)
                const totalDebt = debtMonths * (c.rent_amount || 0)

                // Skip if no debt unless manually marked as delinquent
                if (debtMonths <= 0 && tenant?.status !== 'delinquent') return null

                // SAFETY: If debt is astronomical (e.g. 24,000 months), something is wrong with the date
                const isExtremeDebt = debtMonths > 120 // More than 10 years
                
                // Calculate which months are pending (most recent ones back to PaidMonths count)
                // If it's extreme, log it and don't show the huge number
                if (isExtremeDebt) {
                    console.error('Astronomic debt detected. Contract:', c.id, 'Tenant:', tenant?.name, 'Start Date:', c.start_date)
                }

                return {
                    tenant: tenant?.name || 'Desconocido',
                    property: property?.name || 'Sin Propiedad',
                    unit: unit?.name || 'N/A',
                    startDate: c.start_date ? new Date(c.start_date).toLocaleDateString('es-VE') : '-',
                    endDate: c.end_date ? new Date(c.end_date).toLocaleDateString('es-VE') : 'Indefinido',
                    months: isExtremeDebt ? "Revisar Fecha" : debtMonths,
                    debt: isExtremeDebt ? 0 : totalDebt,
                    property_id: unit?.property_id
                }
            }).filter(Boolean)

            // Filter by selected properties
            // Note: properties filter is applied here instead of the query for complexity of nested filter
            const finalData = properties.length > 0
                ? reportData.filter((r: any) => properties.includes(r.property_id))
                : reportData

            return finalData
        } catch (err: any) {
            console.error('Error fetching delinquency:', err)
            toast.error('Error al generar reporte de morosidad')
            return []
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchMaintenance = useCallback(async (properties: string[]) => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('maintenance_requests')
                .select(`*, properties(id, name)`)

            if (error) throw error

            const filtered = properties.length > 0
                ? data.filter((m: any) => properties.includes(m.property_id))
                : data

            return filtered
        } catch (err: any) {
            console.error(err)
            toast.error('Error al generar reporte de mantenimiento')
            return []
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchPropertyPerformance = useCallback(async (properties: string[]) => {
        setIsLoading(true)
        try {
            // 1. Fetch all payments (Income) - Simplified
            const { data: payments } = await supabase
                .from('payments')
                .select(`amount, contract_id`)
                .in('status', ['paid', 'approved'])
                .eq('currency', 'USD') 

            // 2. Fetch all expenses
            const { data: expenses } = await supabase
                .from('expenses')
                .select(`amount, property_id`)

            // 3. We need property names and contract associations
            const { data: props } = await supabase.from('properties').select('id, name')
            
            // 4. Batch fetch contract/property mapping for performance summary
            const contractIds = Array.from(new Set(payments?.map((p: any) => p.contract_id).filter(Boolean)))
            const contractsMap: Record<string, string> = {} // contract_id -> property_id

            if (contractIds.length > 0) {
                const { data: contractsData } = await supabase
                    .from('contracts')
                    .select(`id, units(property_id)`)
                    .in('id', contractIds)
                
                contractsData?.forEach((c: any) => {
                    const unit = Array.isArray(c.units) ? c.units[0] : c.units
                    contractsMap[c.id] = unit?.property_id
                })
            }

            // Aggregate
            const report = props?.map(p => {
                if (properties.length > 0 && !properties.includes(p.id)) return null

                const income = payments
                    ?.filter((pay: any) => contractsMap[pay.contract_id] === p.id)
                    .reduce((sum, curr) => sum + (curr.amount || 0), 0) || 0

                const expense = expenses
                    ?.filter((exp: any) => exp.property_id === p.id)
                    .reduce((sum, curr) => sum + (curr.amount || 0), 0) || 0

                return {
                    property: p.name,
                    income,
                    expense,
                    net: income - expense
                }
            }).filter(Boolean) || []

            return report

        } catch (err: any) {
            console.error(err)
            toast.error('Error al generar reporte de rendimiento')
            return []
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        isLoading,
        error,
        fetchIncomeExpense,
        fetchOccupancy,
        fetchDelinquency,
        fetchMaintenance,
        fetchPropertyPerformance
    }
}
