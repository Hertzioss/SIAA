"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building, Users, DollarSign, Clock, AlertCircle, Calendar } from "lucide-react"
import { getOwnerDashboardMetrics } from "@/actions/owner-dashboard"
import { formatCurrency } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRouter } from "next/navigation"

export default function OwnerDashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState<any>(null)
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                setLoading(false)
                return
            }

            const { data, error } = await getOwnerDashboardMetrics(session.access_token, selectedMonth, selectedYear)
            if (data) {
                setMetrics(data)
            }
            if (error) {
                console.error(error)
            }
            setLoading(false)
        }
        loadData()
    }, [selectedMonth, selectedYear])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-20 w-1/3 bg-muted animate-pulse rounded" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                    ))}
                </div>
            </div>
        )
    }

    if (!metrics) return <div>No se pudo cargar la información.</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {metrics.ownerName}</h1>
                    <p className="text-muted-foreground">
                        Resumen financiero y operativo de sus inmuebles.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[140px] border-0 focus:ring-0 h-auto p-0">
                                <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Meses</SelectItem>
                                <SelectItem value="1">Enero</SelectItem>
                                <SelectItem value="2">Febrero</SelectItem>
                                <SelectItem value="3">Marzo</SelectItem>
                                <SelectItem value="4">Abril</SelectItem>
                                <SelectItem value="5">Mayo</SelectItem>
                                <SelectItem value="6">Junio</SelectItem>
                                <SelectItem value="7">Julio</SelectItem>
                                <SelectItem value="8">Agosto</SelectItem>
                                <SelectItem value="9">Septiembre</SelectItem>
                                <SelectItem value="10">Octubre</SelectItem>
                                <SelectItem value="11">Noviembre</SelectItem>
                                <SelectItem value="12">Diciembre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Year Selector */}
                    <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[100px] border-0 focus:ring-0 h-auto p-0">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Años</SelectItem>
                                {Array.from({ length: new Date().getFullYear() - 2023 + 6 }).map((_, i) => {
                                    const year = 2023 + i;
                                    return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Card
                    className={selectedMonth !== 'all' && (metrics.totalIncomeMonthUSD > 0 || metrics.totalIncomeMonthVES > 0) ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800" : ""}
                    onClick={() => { 
                        if (selectedMonth !== 'all' && (metrics.totalIncomeMonthUSD > 0 || metrics.totalIncomeMonthVES > 0)) {
                            router.push(`/owners/income?month=${selectedMonth}&year=${selectedYear}`)
                        } 
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex flex-col items-start gap-1">
                            {selectedMonth !== 'all' && (metrics.totalIncomeMonthUSD > 0 || metrics.totalIncomeMonthVES > 0) && (
                                <span className="text-[10px] font-normal bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full dark:bg-emerald-900/50 dark:text-emerald-200 whitespace-nowrap">Ver Reporte</span>
                            )}
                            Ingresos del Período
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2 mt-1">
                            <div className="flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-green-600 dark:text-green-500">
                                    {formatCurrency(metrics.totalIncomeMonthUSD, 'USD')}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">USD</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-500">
                                    {formatCurrency(metrics.totalIncomeMonthVES, 'VES')}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">Bs.</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Pagos aprobados del período
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className={selectedMonth !== 'all' && (metrics.totalExpensesMonthUSD > 0 || metrics.totalExpensesMonthVES > 0) ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800" : ""}
                    onClick={() => { 
                        if (selectedMonth !== 'all' && (metrics.totalExpensesMonthUSD > 0 || metrics.totalExpensesMonthVES > 0)) {
                            router.push(`/owners/expenses-report?month=${selectedMonth}&year=${selectedYear}`)
                        } 
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex flex-col items-start gap-1">
                            {selectedMonth !== 'all' && (metrics.totalExpensesMonthUSD > 0 || metrics.totalExpensesMonthVES > 0) && (
                                <span className="text-[10px] font-normal bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full dark:bg-rose-900/50 dark:text-rose-200 whitespace-nowrap">Ver Reporte</span>
                            )}
                            Egresos del Período
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2 mt-1">
                            <div className="flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-rose-600 dark:text-rose-500">
                                    {formatCurrency(metrics.totalExpensesMonthUSD || 0, 'USD')}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">USD</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xl font-bold text-rose-600 dark:text-rose-500">
                                    {formatCurrency(metrics.totalExpensesMonthVES || 0, 'VES')}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">Bs.</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Egresos prorrateados
                        </p>
                    </CardContent>
                </Card>
                <Card 
                    className={selectedMonth !== 'all' && metrics.pendingPaymentsCount > 0 ? "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800" : ""}
                    onClick={() => { 
                        if (selectedMonth !== 'all' && metrics.pendingPaymentsCount > 0) {
                            router.push(`/owners/delinquency?month=${selectedMonth}&year=${selectedYear}`)
                        } 
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex flex-col items-start gap-1">
                            {selectedMonth !== 'all' && metrics.pendingPaymentsCount > 0 && (
                                <span className="text-[10px] font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full dark:bg-amber-900/50 dark:text-amber-200 whitespace-nowrap">Ver Reporte</span>
                            )}
                            Pagos Pendientes
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {selectedMonth === 'all' && selectedYear === 'all' ? (
                            <p className="text-sm text-muted-foreground pt-1">Selecciona un período para ver pendientes.</p>
                        ) : (
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {metrics.pendingPaymentsCount}
                                    </span>
                                    <span className="text-xs text-muted-foreground">inquilinos sin pagar</span>
                                </div>
                                {metrics.pendingUSD > 0 && (
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                            ${metrics.pendingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">USD</span>
                                    </div>
                                )}
                                {metrics.pendingVES > 0 && (
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                            Bs. {metrics.pendingVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">Bs.</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Canon no cobrado en el período
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Ocupación
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.occupiedUnits} / {metrics.totalUnits}</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.occupancyRate.toFixed(1)}% Tasa de ocupación
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Vacantes
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.vacantUnits}</div>
                        <p className="text-xs text-muted-foreground">
                            Unidades disponibles
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardDescription>
                            Últimos pagos aprobados del período seleccionado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {metrics.recentPayments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No hay pagos aprobados en el período seleccionado.
                                </p>
                            ) : (
                                metrics.recentPayments.map((payment: any) => (
                                    <div key={payment.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0 gap-4">
                                        <div className="space-y-0.5 min-w-0">
                                            {/* Propiedad + Unidad */}
                                            <p className="text-sm font-semibold leading-none truncate">
                                                {payment.propertyName}
                                                {payment.unitName && (
                                                    <span className="text-muted-foreground font-normal"> · {payment.unitName}</span>
                                                )}
                                            </p>
                                            {/* Inquilino */}
                                            {payment.tenantName && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {payment.tenantName}
                                                </p>
                                            )}
                                            {/* Concepto + Fecha */}
                                            <p className="text-xs text-muted-foreground">
                                                {payment.concept
                                                    ? `${payment.concept} · `
                                                    : ''}
                                                {new Date(payment.date + 'T12:00:00').toLocaleDateString('es-VE', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {payment.amountUSD > 0 && (
                                                <p className="text-sm font-bold text-green-600 dark:text-green-500 whitespace-nowrap">
                                                    +${payment.amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                            {payment.amountVES > 0 && (
                                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                                    +Bs. {payment.amountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Estado General — tabla por propiedad */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Estado General</CardTitle>
                        <CardDescription>
                            Resumen de ocupación por inmueble
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-auto max-h-72">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Nombre</th>
                                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Dirección</th>
                                        <th className="text-center px-4 py-2 font-medium text-muted-foreground">Ocupadas</th>
                                        <th className="text-center px-4 py-2 font-medium text-muted-foreground">Vacantes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.propertiesSummary?.map((prop: any) => (
                                        <tr key={prop.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-2 font-semibold uppercase text-xs tracking-wide">
                                                {prop.name}
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground text-xs flex items-center gap-1">
                                                <Building className="h-3 w-3 shrink-0" />
                                                {prop.address}
                                            </td>
                                            <td className="px-4 py-2 text-center font-bold text-blue-600 dark:text-blue-400">
                                                {prop.occupiedUnits}
                                            </td>
                                            <td className="px-4 py-2 text-center font-bold text-rose-500 dark:text-rose-400">
                                                {prop.vacantUnits}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

