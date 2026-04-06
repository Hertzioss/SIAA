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

    const fetchIncomeExpense = useCallback(async (months: string[], year: string, properties: string[], owners: string[] = []) => {
        setIsLoading(true)
        setError(null)
        try {
            const monthMap: Record<string, number> = {
                'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3, 'MAYO': 4, 'JUNIO': 5,
                'JULIO': 6, 'AGOSTO': 7, 'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11
            }

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

            const isDateInSelectedMonths = (dateStr: string) => {
                if (!dateStr) return false
                // Handle both - and / and full ISO strings
                const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
                const parts = cleanDate.includes('-') ? cleanDate.split('-') : cleanDate.split('/')
                if (parts.length < 2) return false
                const monthPart = parseInt(parts[1], 10) - 1 // 0-11
                return selectedIndices.includes(monthPart)
            }

            // 1. Fetch Payments (Tenant Income)
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

            // Fetch Contract Details for Properties
            const contractIds = Array.from(new Set(rawPaymentsData?.map((p: any) => p.contract_id).filter(Boolean)))
            const contractsMap: Record<string, any> = {}

            if (contractIds.length > 0) {
                const { data: contractsData } = await supabase
                    .from('contracts')
                    .select(`
                        id,
                        rent_amount,
                        units (
                            id,
                            properties (
                                id,
                                name
                            )
                        )
                    `)
                    .in('id', contractIds)

                contractsData?.forEach((c: any) => {
                    const unit = Array.isArray(c.units) ? c.units[0] : c.units
                    const property = Array.isArray(unit?.properties) ? unit?.properties[0] : unit?.properties
                    contractsMap[c.id] = {
                        property_id: property?.id,
                        property_name: property?.name,
                        rent_amount: c.rent_amount
                    }
                })
            }

            // 2. Fetch General Expenses
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select(`*, properties (id, name)`)
                .gte('date', startDate)
                .lte('date', endDate)
            if (expensesError) throw expensesError

            // 3. Fetch Owner Expenses (from the fixed page)
            const { data: ownerExpensesData, error: ownerExpensesError } = await supabase
                .from('owner_expenses')
                .select(`*, property:properties (id, name), owner:owners(id, name)`)
                .gte('date', startDate)
                .lte('date', endDate)
            if (ownerExpensesError) throw ownerExpensesError

            // 4. Fetch Owner Incomes
            const { data: ownerIncomesData, error: ownerIncomesError } = await supabase
                .from('owner_incomes')
                .select(`*, property:properties (id, name), owner:owners(id, name)`)
                .gte('date', startDate)
                .lte('date', endDate)
            if (ownerIncomesError) throw ownerIncomesError

            // Filter Incomes by Property and Month
            const filteredPayments = rawPaymentsData.filter((p: any) => {
                const pId = contractsMap[p.contract_id || '']?.property_id
                const matchProperty = properties.length > 0 ? (pId && properties.includes(pId)) : true
                const matchMonth = isDateInSelectedMonths(p.date)
                return matchProperty && matchMonth
            })

            const filteredOwnerIncomes = (ownerIncomesData || []).filter((i: any) => {
                const matchProperty = properties.length > 0 ? (i.property_id && properties.includes(i.property_id)) : true
                const matchMonth = isDateInSelectedMonths(i.date)
                return matchProperty && matchMonth
            })

            // Filter Expenses by Property and Month
            const filteredGeneralExpenses = (expensesData || []).filter((e: any) => {
                const matchProperty = properties.length > 0 ? (e.property_id && properties.includes(e.property_id)) : true
                const matchMonth = isDateInSelectedMonths(e.date)
                return matchProperty && matchMonth
            })

            // COLLECT ALL AVAILABLE RATES FOR THIS PERIOD
            const ratesByDate: Record<string, number> = {}
            const allRawItems = [...(rawPaymentsData || []), ...(expensesData || []), ...(ownerExpensesData || []), ...(ownerIncomesData || [])]
            allRawItems.forEach((item: any) => {
                if (item.exchange_rate && item.exchange_rate > 0) {
                    const d = item.date && isValid(parseISO(item.date)) ? format(parseISO(item.date), 'dd/MM/yyyy') : item.date
                    if (d) ratesByDate[d] = item.exchange_rate
                }
            })
            
            // Helper to get rate with fallback to other items in the same month if exact date not found
            const getRate = (itemDate: string) => {
                if (ratesByDate[itemDate]) return ratesByDate[itemDate]
                // Fallback: look for ANY rate in the same month/year
                const [day, month, year] = itemDate.split('/')
                const monthlyRates = Object.entries(ratesByDate).filter(([d]) => d.endsWith(`${month}/${year}`))
                if (monthlyRates.length > 0) return monthlyRates[0][1] // Use first available for that month
                return 0
            }

            const filteredOwnerExpenses = (ownerExpensesData || []).filter((e: any) => {
                // If specific owners are selected, we MUST show their expenses even if they have no property linked
                const matchOwner = owners.length > 0 ? (e.owner_id && owners.includes(e.owner_id)) : true
                // If owners are selected, property filter is less strict for their personal expenses
                const matchProperty = (properties.length > 0) ? (e.property_id && properties.includes(e.property_id)) : true
                
                const matchMonth = isDateInSelectedMonths(e.date)
                
                if (owners.length > 0) {
                    return matchOwner && matchMonth
                }
                return matchProperty && matchMonth
            })

            // COMBINE AND TRANSFORM INCOMES
            const dataUsd = [
                ...filteredPayments.filter((p: any) => p.currency?.toUpperCase().trim() === 'USD').map((p: any) => {
                    const d = p.date && isValid(parseISO(p.date)) ? format(parseISO(p.date), 'dd/MM/yyyy') : p.date
                    const rate = p.exchange_rate || getRate(d)
                    return {
                        date: d,
                        tenantName: (Array.isArray(p.tenants) ? p.tenants[0]?.name : p.tenants?.name) || 'Inquilino',
                        concept: p.concept,
                        credit: p.amount,
                        debit: 0,
                        balance: p.amount,
                        rate: rate,
                        originalAmount: (p.amount || 0) * rate
                    }
                }),
                ...filteredOwnerIncomes.filter((i: any) => i.currency?.toUpperCase().trim() === 'USD').map((i: any) => {
                    const d = i.date && isValid(parseISO(i.date)) ? format(parseISO(i.date), 'dd/MM/yyyy') : i.date
                    const rate = i.exchange_rate || getRate(d)
                    return {
                        date: d,
                        tenantName: i.owner?.name || 'Propietario',
                        concept: `${i.category} - ${i.description}`,
                        credit: i.amount,
                        debit: 0,
                        balance: i.amount,
                        rate: rate,
                        originalAmount: (i.amount || 0) * rate
                    }
                })
            ]

            const dataBs = [
                ...filteredPayments.filter((p: any) => p.currency?.toUpperCase().trim() !== 'USD').map((p: any) => {
                    const rate = p.exchange_rate || 0
                    const incomeUsd = rate > 0 ? (p.amount / rate) : 0
                    return {
                        date: p.date && isValid(parseISO(p.date)) ? format(parseISO(p.date), 'dd/MM/yyyy') : p.date,
                        tenantName: (Array.isArray(p.tenants) ? p.tenants[0]?.name : p.tenants?.name) || 'Inquilino',
                        concept: p.concept,
                        credit: p.amount,
                        debit: 0,
                        balance: p.amount,
                        rate: rate,
                        incomeUsd: incomeUsd,
                        balanceUsd: incomeUsd,
                        originalAmount: p.amount // Consistent with dataUsd
                    }
                }),
                ...filteredOwnerIncomes.filter((i: any) => i.currency !== 'USD').map((i: any) => {
                    const rate = i.exchange_rate || 0
                    const incomeUsd = rate > 0 ? (i.amount / rate) : 0
                    return {
                        date: i.date && isValid(parseISO(i.date)) ? format(parseISO(i.date), 'dd/MM/yyyy') : i.date,
                        tenantName: i.owner?.name || 'Propietario',
                        concept: `${i.category} - ${i.description}`,
                        credit: i.amount,
                        debit: 0,
                        balance: i.amount,
                        rate: rate,
                        incomeUsd: incomeUsd,
                        balanceUsd: incomeUsd,
                        originalAmount: i.amount // Consistent with dataUsd
                    }
                })
            ]

            const categoryMap: Record<string, string> = {
                'fee': 'Honorarios / Comisiones',
                'withdrawal': 'Retiro / Pago',
                'tax': 'Impuestos',
                'maintenance': 'Mantenimiento',
                'other': 'Otro / Varios'
            }

            // COMBINE AND TRANSFORM EXPENSES
            const dataExpenses = [
                ...filteredGeneralExpenses.map((e: any) => {
                    const isBs = e.currency === 'Bs' || e.currency === 'VES'
                    const rate = e.exchange_rate || 0
                    const amountUsd = isBs && rate > 0 ? (e.amount / rate) : e.amount
                    const amountBs = isBs ? e.amount : (e.amount * rate)
                    return {
                        date: e.date && isValid(parseISO(e.date)) ? format(parseISO(e.date), 'dd/MM/yyyy') : e.date,
                        category: categoryMap[e.category] || e.category,
                        description: e.description,
                        amount: amountUsd, // USD for balance
                        originalAmount: amountBs, // Always have BS equivalent
                        currency: e.currency,
                        rate: rate,
                        status: e.status
                    }
                }),
                ...filteredOwnerExpenses.map((e: any) => {
                    const isBs = e.currency === 'Bs' || e.currency === 'VES'
                    const rate = e.exchange_rate || 0
                    const amountUsd = isBs && rate > 0 ? (e.amount / rate) : e.amount
                    const amountBs = isBs ? e.amount : (e.amount * rate)
                    return {
                        date: e.date && isValid(parseISO(e.date)) ? format(parseISO(e.date), 'dd/MM/yyyy') : e.date,
                        category: categoryMap[e.category] || e.category,
                        description: `${e.description} (${e.owner?.name || ''})`,
                        amount: amountUsd,
                        originalAmount: amountBs, // Always have BS equivalent
                        currency: e.currency,
                        rate: rate,
                        status: e.status
                    }
                })
            ]

            // Calculate Net Income calculation per property to distribute correctly
            const propertyFinancials: Record<string, { income: number, expense: number, net: number }> = {}
            const ownerShares: Record<string, { name: string, amount: number, personalAdjustments: number }> = {}

            filteredPayments.forEach((p: any) => {
                const pid = contractsMap[p.contract_id || '']?.property_id
                if (!pid) return
                if (!propertyFinancials[pid]) propertyFinancials[pid] = { income: 0, expense: 0, net: 0 }
                let amountUsd = p.currency === 'VES' ? (p.exchange_rate > 0 ? (p.amount / p.exchange_rate) : 0) : p.amount
                propertyFinancials[pid].income += amountUsd
            })

            filteredOwnerIncomes.forEach((i: any) => {
                const pid = i.property_id
                let amountUsd = i.currency !== 'USD' ? (i.exchange_rate > 0 ? (i.amount / i.exchange_rate) : 0) : i.amount
                
                if (pid) {
                    if (!propertyFinancials[pid]) propertyFinancials[pid] = { income: 0, expense: 0, net: 0 }
                    propertyFinancials[pid].income += amountUsd
                } else {
                    const ownerName = i.owner?.name || 'Desconocido'
                    if (!ownerShares[ownerName]) ownerShares[ownerName] = { name: ownerName, amount: 0, personalAdjustments: 0 }
                    if (ownerShares[ownerName].personalAdjustments === undefined) ownerShares[ownerName].personalAdjustments = 0
                    ownerShares[ownerName].personalAdjustments += amountUsd
                }
            })

            filteredGeneralExpenses.forEach((e: any) => {
                const pid = e.property_id
                if (!pid) return
                if (!propertyFinancials[pid]) propertyFinancials[pid] = { income: 0, expense: 0, net: 0 }
                let amountUsd = (e.currency === 'Bs' || e.currency === 'VES') ? (e.exchange_rate > 0 ? (e.amount / e.exchange_rate) : 0) : e.amount
                propertyFinancials[pid].expense += amountUsd
            })

            filteredOwnerExpenses.forEach((e: any) => {
                const pid = e.property_id
                let amountUsd = (e.currency === 'Bs' || e.currency === 'VES') ? (e.exchange_rate > 0 ? (e.amount / e.exchange_rate) : 0) : e.amount
                
                if (pid) {
                    if (!propertyFinancials[pid]) propertyFinancials[pid] = { income: 0, expense: 0, net: 0 }
                    propertyFinancials[pid].expense += amountUsd
                } else {
                    // Personal owner expense with no property: substract from ownerShares later or keep in a separate map
                    const ownerName = e.owner?.name || 'Desconocido'
                    if (!ownerShares[ownerName]) ownerShares[ownerName] = { name: ownerName, amount: 0, personalAdjustments: 0 }
                    if (ownerShares[ownerName].personalAdjustments === undefined) ownerShares[ownerName].personalAdjustments = 0
                    ownerShares[ownerName].personalAdjustments -= amountUsd
                }
            })

            // Calculate Net for each property
            Object.keys(propertyFinancials).forEach(pid => {
                propertyFinancials[pid].net = propertyFinancials[pid].income - propertyFinancials[pid].expense
            })

            // Distribute to owners
            const { data: ownersData } = await supabase.from('property_owners').select(`percentage, property_id, owner:owners (id, name)`)
            let totalNetIncome = 0

            const relevantPropertyOwners = properties.length > 0 ? (ownersData || []).filter((po: any) => properties.includes(po.property_id)) : (ownersData || [])

            const distributionMap: Record<string, { owner: string, properties: string[], totalShare: number, totalGrossForOwnerProps: number, personalAdjustments: number }> = {}

            Object.keys(propertyFinancials).forEach(pid => {
                const net = propertyFinancials[pid].net
                const income = propertyFinancials[pid].income
                const propsOwners = relevantPropertyOwners.filter((po: any) => po.property_id === pid)
                
                const pInfo: any = Object.values(contractsMap).find((c: any) => c.property_id === pid)
                const propertyName = pInfo?.property_name || 'Propiedad'

                propsOwners.forEach((po: any) => {
                    const ownerName = po.owner?.name || 'Desconocido'
                    const share = net * (po.percentage / 100)
                    const grossPortion = income * (po.percentage / 100)

                    if (!distributionMap[ownerName]) {
                        distributionMap[ownerName] = { 
                            owner: ownerName, 
                            properties: [], 
                            totalShare: 0, 
                            totalGrossForOwnerProps: 0, 
                            personalAdjustments: 0 
                        }
                    }
                    
                    if (!distributionMap[ownerName].properties.includes(propertyName)) {
                        distributionMap[ownerName].properties.push(propertyName)
                    }
                    distributionMap[ownerName].totalShare += share
                    distributionMap[ownerName].totalGrossForOwnerProps += income // Sum the TOTAL income of properties where they participate
                })
            })

            // Collect personal adjustments
            Object.keys(ownerShares).forEach(name => {
                if (ownerShares[name].personalAdjustments !== 0) {
                    if (!distributionMap[name]) {
                        distributionMap[name] = { 
                            owner: name, 
                            properties: ['AJUSTES'], 
                            totalShare: 0, 
                            totalGrossForOwnerProps: 0, 
                            personalAdjustments: 0 
                        }
                    }
                    distributionMap[name].personalAdjustments += ownerShares[name].personalAdjustments
                }
            })

            const dataDistribution = Object.values(distributionMap).map(d => {
                const finalAmount = d.totalShare + d.personalAdjustments
                // Participation % is (totalShare / sum of net of properties they own)
                // Actually, if they own 100% of Prop A ($1000) and Prop B ($1000). net is 2000. totalShare is 2000. % is 100.
                // We'll sum the weighted percentages: (Share_A + Share_B) / (Net_A + Net_B)
                let weightedPercentage = 0
                // Sum the nets of all properties this owner participates in
                const totalNetOfOwnedProps = Object.keys(propertyFinancials)
                    .filter(pid => relevantPropertyOwners.some((po: any) => po.property_id === pid && po.owner?.name === d.owner))
                    .reduce((sum, pid) => sum + propertyFinancials[pid].net, 0)
                
                if (totalNetOfOwnedProps > 0) {
                    weightedPercentage = (d.totalShare / totalNetOfOwnedProps) * 100
                }

                return {
                    owner: d.owner,
                    property: d.properties.join(', '),
                    percentage: weightedPercentage,
                    amount: finalAmount
                }
            })

            return {
                dataUsd,
                dataBs,
                dataExpenses,
                dataDistribution
            }

        } catch (err) {
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
                    rent: c.rent_amount || 0,
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
