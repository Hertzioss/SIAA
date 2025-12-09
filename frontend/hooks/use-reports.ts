import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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

            // 1. Fetch Payments
            let paymentsQuery = supabase
                .from('payments')
                .select(`
                    *,
                    contracts (
                        units (
                            properties (
                                id,
                                name
                            )
                        )
                    )
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .in('status', ['paid', 'approved']) // Include approved (reconciled) payments

            const { data: paymentsData, error: paymentsError } = await paymentsQuery
            if (paymentsError) throw paymentsError

            // 2. Fetch Expenses
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
            // This handles the "gap" case e.g. Jan and Mar selected, but not Feb.
            const isDateInSelectedMonths = (dateStr: string) => {
                const d = new Date(dateStr)
                // Adjust for timezone issues if necessary, but usually date string yyyy-mm-dd is fine
                // We use getMonth() which is 0-11.
                // Note: creating Date from "2024-01-01" might be UTC. 
                // Let's be careful. simpler: parse month part from string "YYYY-MM-DD"
                const monthPart = parseInt(dateStr.split('-')[1]) - 1 // 0-11
                return selectedIndices.includes(monthPart)
            }

            // Filter by properties AND specific months
            const filteredPayments = paymentsData.filter((p: any) => {
                const matchProperty = properties.length > 0 ? properties.includes(p.contracts?.units?.properties?.id) : true
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
                    date: p.date,
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
                        date: p.date,
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
                date: e.date,
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
            const { data, error } = await supabase
                .from('units')
                .select(`*, properties(id, name)`)

            if (error) throw error

            const filtered = properties.length > 0
                ? data.filter((u: any) => properties.includes(u.property_id))
                : data

            return filtered.map((u: any) => ({
                property: u.properties?.name || 'Desconocida',
                unit: u.name,
                status: u.status === 'occupied' ? 'Ocupado' : 'Vacante'
            }))
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
            const { data: tenants, error } = await supabase
                .from('tenants')
                .select(`
                    *,
                    contracts (
                        id,
                        rent_amount,
                        units (
                            name,
                            property_id,
                            properties(id, name)
                        )
                    )
                `)
                .eq('status', 'active') // Check active tenants who might owe money? Or explicit 'delinquent' status?
                // Ideally we check payment history, but for now lets rely on status or manual flag if exists,
                // OR checking last payment date.
                // For MVP: let's filter those with status 'delinquent' if you have it, 
                // OR calculate it.
                // Seeing as we don't have a complex debt calc yet, 
                // let's fetch ALL active tenants and see who hasn't paid current month?
                // Just fetching 'delinquent' status as per request placeholder logic for now.
                .eq('status', 'delinquent')

            if (error) throw error

            const filtered = properties.length > 0
                ? tenants.filter((t: any) => t.contracts?.some((c: any) => properties.includes(c.units?.property_id)))
                : tenants

            return filtered.map((t: any) => {
                const c = t.contracts?.[0]
                return {
                    tenant: t.name,
                    unit: c?.units?.name || 'N/A',
                    months: 2, // Dummy
                    debt: (c?.rent_amount || 0) * 2
                }
            })
        } catch (err: any) {
            console.error('Error fetching delinquency:', err)
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
            // Fetch all payments (Income)
            const { data: payments } = await supabase
                .from('payments')
                .select(`amount, contracts(units(property_id))`)
                .in('status', ['paid', 'approved'])
                .eq('currency', 'USD') // Normalize to USD for this report or handle both? Let's do USD only for performance summary for now.

            // Fetch all expenses
            const { data: expenses } = await supabase
                .from('expenses')
                .select(`amount, property_id`)

            // We need property names
            const { data: props } = await supabase.from('properties').select('id, name')

            // Aggregate
            // This is heavy on client side but fine for small scale
            const report = props?.map(p => {
                if (properties.length > 0 && !properties.includes(p.id)) return null

                const income = payments
                    ?.filter((pay: any) => pay.contracts?.units?.property_id === p.id)
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
