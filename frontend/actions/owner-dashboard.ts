'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"

// Use admin client for all server-side queries

// Identical to admin dashboard: extracts YYYY-MM from string to avoid TZ shift
function matchesDateFilter(dateString: string, month: string, year: string): boolean {
    if (!dateString) return false
    if (month === 'all' && year === 'all') return true
    const datePart = dateString.split('T')[0]
    const [y, m] = datePart.split('-')
    const yearMatch  = year  === 'all' || y === year
    const monthMatch = month === 'all' || parseInt(m).toString() === month
    return yearMatch && monthMatch
}

// Identical to admin dashboard: separates USD/VES using stored exchange_rate
function getDualAmount(item: { amount: any; currency?: string; exchange_rate?: any }) {
    const amount   = Number(item.amount || 0)
    const currency = (item.currency || 'USD').toUpperCase().trim()
    const isBs     = currency === 'BS' || currency === 'VES' || currency === 'BS.'
    const rate     = Number(item.exchange_rate || 0)
    if (isBs) {
        return { usd: rate > 0 ? amount / rate : 0, bs: amount }
    } else {
        return { usd: amount, bs: amount * (rate || 1) }
    }
}

async function getAuthenticatedUser(accessToken: string) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error || !user) return null
    return user
}

async function getCurrentOwner(accessToken: string) {
    const user = await getAuthenticatedUser(accessToken)
    if (!user) return null

    // Find the owner record linked to this user
    const { data: owner } = await supabaseAdmin
        .from('owners')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return owner
}

export async function getOwnerDashboardMetrics(accessToken: string, month: string = 'all', year: string = 'all') {
    const owner = await getCurrentOwner(accessToken)
    if (!owner) {
        const user = await getAuthenticatedUser(accessToken)
        if (user) {
            return { error: `Acceso Denegado: El usuario (${user.email}) no está registrado como propietario.` }
        }
        return { error: 'No autorizado / Sesión inválida' }
    }

    try {
        // 1. Get Properties for this owner (via property_owners join)
        const { data: propertyOwners, error: poError } = await supabaseAdmin
            .from('property_owners')
            .select(`
                percentage,
                property:properties (
                    id,
                    name,
                    address,
                    units (
                        id,
                        name,
                        status,
                        contracts (
                            id,
                            status,
                            rent_amount,
                            tenant:tenants ( name ),
                            payments (
                                id,
                                amount,
                                status,
                                date,
                                billing_period,
                                currency,
                                exchange_rate,
                                concept
                            )
                        )
                    )
                )
            `)
            .eq('owner_id', owner.id)

        if (poError) throw poError

        const ownerPropertyIds = propertyOwners?.map((po: any) => po.property?.id).filter(Boolean) || []

        // 3. Collect active contract IDs + rent amounts for "who hasn't paid" calculation
        //    We need: active contracts for this owner, then subtract those WITH approved payment in period
        const activeContractMap: Record<string, { rent_amount: number; currency: string; tenantName: string; propertyName: string; unitName: string }> = {}
        propertyOwners?.forEach((po: any) => {
            const propertyName = po.property?.name ?? ''
            po.property?.units?.forEach((u: any) => {
                const unitName = u.name ?? ''
                u.contracts?.forEach((c: any) => {
                    if (c.status === 'active') {
                        activeContractMap[c.id] = {
                            rent_amount: Number(c.rent_amount || 0),
                            currency: 'USD', // contracts store rent in USD by default
                            tenantName: c.tenant?.name ?? '',
                            propertyName,
                            unitName
                        }
                    }
                })
            })
        })

        const activeContractIds = Object.keys(activeContractMap)

        // 4. Find which active contracts DO have an approved payment in the selected period
        let pendingPaymentsCount = 0
        let pendingUSD = 0
        let pendingVES = 0
        let delinquentTenants: any[] = []

        if (activeContractIds.length > 0 && (month !== 'all' || year !== 'all')) {
            // Fetch approved payments for these contracts in the selected period
            const { data: approvedInPeriod } = await supabaseAdmin
                .from('payments')
                .select('contract_id, amount, currency, exchange_rate, billing_period, date')
                .in('contract_id', activeContractIds)
                .eq('status', 'approved')

            // Build set of contract_ids that HAVE been paid in the selected period
            const paidContractIds = new Set<string>()
            approvedInPeriod?.forEach((p: any) => {
                const dateToCheck = p.billing_period || p.date
                if (dateToCheck && matchesDateFilter(dateToCheck, month, year)) {
                    paidContractIds.add(p.contract_id)
                }
            })

            // Contracts without payment in period = delinquent tenants
            for (const [contractId, info] of Object.entries(activeContractMap)) {
                if (!paidContractIds.has(contractId)) {
                    pendingPaymentsCount++
                    pendingUSD += info.rent_amount // rent_amount is in USD
                    delinquentTenants.push({
                        tenantName: info.tenantName,
                        propertyName: info.propertyName,
                        unitName: info.unitName,
                        rent_amount: info.rent_amount,
                        currency: info.currency
                    })
                }
            }
            
            // Sort delinquent tenants alphabetically
            delinquentTenants.sort((a, b) => a.tenantName.localeCompare(b.tenantName))
        }

        // Calculate Metrics
        let totalProperties = 0
        let totalUnits = 0
        let occupiedUnits = 0
        let vacantUnits = 0

        let totalIncomeMonthUSD = 0
        let totalIncomeMonthVES = 0
        let recentPayments: any[] = []
        let propertiesSummary: { id: string; name: string; address: string; occupiedUnits: number; vacantUnits: number; totalUnits: number }[] = []

        propertyOwners?.forEach((po: any) => {
            const property = po.property
            if (!property) return

            // Ownership stake for this property (0–100 → 0.0–1.0)
            const ownershipRatio = Number(po.percentage) / 100

            totalProperties++

            // Per-property summary for Estado General table
            const propOccupied = property.units?.filter((u: any) => u.status === 'occupied').length ?? 0
            const propVacant   = property.units?.filter((u: any) => u.status === 'vacant').length ?? 0
            propertiesSummary.push({
                id: property.id,
                name: property.name,
                address: property.address ?? '',
                occupiedUnits: propOccupied,
                vacantUnits: propVacant,
                totalUnits: property.units?.length ?? 0
            })

            property.units?.forEach((unit: any) => {
                totalUnits++
                if (unit.status === 'occupied') occupiedUnits++
                if (unit.status === 'vacant') vacantUnits++

                unit.contracts?.forEach((contract: any) => {
                    contract.payments?.forEach((payment: any) => {
                        const dateToCheck = payment.billing_period || payment.date
                        if (!dateToCheck) return

                        const isMatch = matchesDateFilter(dateToCheck, month, year)

                        // Income: use getDualAmount (same as admin) then apply ownership ratio
                        if (payment.status === 'approved' && isMatch) {
                            const { usd, bs } = getDualAmount(payment)
                            totalIncomeMonthUSD += usd * ownershipRatio
                            totalIncomeMonthVES += bs  * ownershipRatio
                        }

                        // Pending handled by direct query above — skip here
                        // Recent payments within period
                        if (payment.status === 'approved' && isMatch) {
                            const { usd, bs } = getDualAmount(payment)
                            recentPayments.push({
                                id:           payment.id,
                                propertyName: property.name,
                                unitName:     unit.name ?? null,
                                tenantName:   contract.tenant?.name ?? null,
                                concept:      payment.concept ?? null,
                                amountUSD:    usd * ownershipRatio,
                                amountVES:    bs  * ownershipRatio,
                                currency:     payment.currency ?? 'USD',
                                date:         payment.date,
                                percentage:   po.percentage
                            })
                        }
                    })
                })
            })
        })

        // Sort recent payments
        recentPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Sort properties alphabetically for the table
        propertiesSummary.sort((a, b) => a.name.localeCompare(b.name))

        // 5. Fetch and calculate Expenses
        let totalExpensesMonthUSD = 0
        let totalExpensesMonthVES = 0

        // General property expenses (prorated by ownership)
        if (ownerPropertyIds.length > 0) {
            const { data: generalExpenses } = await supabaseAdmin
                .from('expenses')
                .select('amount, currency, exchange_rate, date, property_id')
                .in('property_id', ownerPropertyIds)
            
            generalExpenses?.forEach(exp => {
                if (month === 'all' && year === 'all' || matchesDateFilter(exp.date, month, year)) {
                    const po = propertyOwners?.find((p: any) => p.property?.id === exp.property_id)
                    const ratio = po ? Number(po.percentage) / 100 : 0
                    const { usd, bs } = getDualAmount(exp)
                    totalExpensesMonthUSD += usd * ratio
                    totalExpensesMonthVES += bs * ratio
                }
            })
        }

        // Owner direct expenses (100% responsibility)
        const { data: ownerExpenses } = await supabaseAdmin
            .from('owner_expenses')
            .select('amount, currency, exchange_rate, date')
            .eq('owner_id', owner.id)
            
        ownerExpenses?.forEach(exp => {
            if (month === 'all' && year === 'all' || matchesDateFilter(exp.date, month, year)) {
                const { usd, bs } = getDualAmount(exp)
                totalExpensesMonthUSD += usd
                totalExpensesMonthVES += bs
            }
        })

        return {
            data: {
                ownerName: owner.name,
                totalProperties,
                totalUnits,
                occupiedUnits,
                vacantUnits,
                occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
                totalIncomeMonthUSD,
                totalIncomeMonthVES,
                totalIncomeMonth: totalIncomeMonthUSD,
                totalExpensesMonthUSD,
                totalExpensesMonthVES,
                pendingPaymentsCount,
                pendingUSD,
                pendingVES,
                delinquentTenants,
                allPayments: recentPayments,
                recentPayments: recentPayments.slice(0, 5),
                propertiesSummary
            }
        }

    } catch (error: any) {
        console.error("Error fetching owner dashboard data:", error)
        return { error: error.message }
    }
}

export async function getOwnerProperties(accessToken: string) {
    const owner = await getCurrentOwner(accessToken)
    if (!owner) return { error: 'No autorizado' }

    try {
        const { data: propertyOwners, error } = await supabaseAdmin
            .from('property_owners')
            .select(`
                percentage,
                property:properties (
                    *,
                    units (
                        id,
                        name,
                        status,
                        type,
                        contracts (
                            id,
                            status,
                            rent_amount,
                            tenant:tenants(name)
                        )
                    )
                )
            `)
            .eq('owner_id', owner.id)

        if (error) throw error

        const properties = propertyOwners.map((po: any) => ({
            ...po.property,
            ownerPercentage: po.percentage,
            unitsCount: po.property.units.length,
            occupiedCount: po.property.units.filter((u: any) => u.status === 'occupied').length
        }))

        return { data: properties }

    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getOwnerPropertyDetails(propertyId: string, accessToken: string) {
    const owner = await getCurrentOwner(accessToken)
    if (!owner) return { error: 'No autorizado' }

    try {
        // 1. Verify ownership
        const { data: ownership, error: ownerError } = await supabaseAdmin
            .from('property_owners')
            .select('percentage')
            .eq('property_id', propertyId)
            .eq('owner_id', owner.id)
            .single()

        if (ownerError || !ownership) throw new Error("No tiene permisos para ver esta propiedad")

        // 2. Fetch Property Details with Units, Contracts (Active), and Expenses
        const { data: property, error: propError } = await supabaseAdmin
            .from('properties')
            .select(`
                *,
                type:property_types(label),
                units (
                    id,
                    name,
                    status,
                    type,
                    area,
                    default_rent_amount,
                    contracts (
                        id,
                        status,
                        start_date,
                        end_date,
                        rent_amount,
                        tenant:tenants(name, email, phone),
                        payments (
                            id,
                            date,
                            amount,
                            status,
                            concept
                        )
                    ),
                    expenses (
                        id,
                        date,
                        amount,
                        category,
                        description,
                        status
                    )
                ),
                property_expenses:expenses (
                    id,
                    date,
                    amount,
                    category,
                    description,
                    status
                )
            `)
            .eq('id', propertyId)
            .single()

        if (propError) throw propError

        // Process data
        // Filter contracts to show only active or latest?
        // Let's attach the "Current Contract" to unit if exists
        const unitsWithTenant = property.units.map((unit: any) => {
            // Find active contract
            const activeContract = unit.contracts?.find((c: any) => c.status === 'active')
            return {
                ...unit,
                activeContract: activeContract || null
            }
        })

        // Combine expenses (Unit level + Property level)
        // Note: 'property_expenses' is direct link to property. 'units.expenses' is link via unit.
        // We want to show a consolidated list maybe?
        let allExpenses: any[] = []
        if (property.property_expenses) {
            allExpenses = [...allExpenses, ...property.property_expenses.map((e: any) => ({ ...e, unitName: 'General' }))]
        }
        property.units?.forEach((u: any) => {
            if (u.expenses) {
                allExpenses = [...allExpenses, ...u.expenses.map((e: any) => ({ ...e, unitName: u.name }))]
            }
        })

        // Sort expenses by date desc
        allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return {
            data: {
                ...property,
                units: unitsWithTenant,
                expenses: allExpenses,
                ownerPercentage: ownership.percentage
            }
        }

    } catch (error: any) {
        console.error("Error fetching property details:", error)
        return { error: error.message }
    }
}

export async function getOwnerExpensesList(accessToken: string) {
    const owner = await getCurrentOwner(accessToken)
    if (!owner) return { error: 'No autorizado' }

    try {
        // 1. Fetch properties owned by this owner
        const { data: propertyOwners, error: poError } = await supabaseAdmin
            .from('property_owners')
            .select('property_id, percentage, property:properties(name)')
            .eq('owner_id', owner.id)

        if (poError) throw poError

        const ownerPropertyIds = propertyOwners?.map((po: any) => po.property_id).filter(Boolean) || []

        // 2. Fetch owner direct expenses
        const { data: ownerExpenses, error: oeError } = await supabaseAdmin
            .from('owner_expenses')
            .select('*, property:properties(name)')
            .eq('owner_id', owner.id)

        if (oeError) throw oeError

        let allExpenses: any[] = ownerExpenses?.map(exp => ({
            ...exp,
            expense_type: 'owner',
            prorated_amount: exp.amount,
            prorated_percentage: 100,
            propertyName: exp.property?.name || 'Personal / No asignado'
        })) || []

        // 3. Fetch general property expenses
        if (ownerPropertyIds.length > 0) {
            const { data: generalExpenses, error: geError } = await supabaseAdmin
                .from('expenses')
                .select('*, property:properties(name)')
                .in('property_id', ownerPropertyIds)
                // Assuming status 'paid' is what they want to see, or maybe all statuses? Let's fetch all.

            if (geError) throw geError

            const proratedGeneralExpenses = generalExpenses?.map(exp => {
                const po = propertyOwners.find((p: any) => p.property_id === exp.property_id)
                const ratio = po ? Number(po.percentage) / 100 : 0
                return {
                    ...exp,
                    expense_type: 'property',
                    prorated_amount: exp.amount * ratio,
                    prorated_percentage: po ? Number(po.percentage) : 0,
                    propertyName: exp.property?.name || 'Desconocido'
                }
            }) || []

            allExpenses = [...allExpenses, ...proratedGeneralExpenses]
        }

        // Sort descending by date
        allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return { data: allExpenses }

    } catch (error: any) {
        console.error("Error fetching owner expenses list:", error)
        return { error: error.message }
    }
}
