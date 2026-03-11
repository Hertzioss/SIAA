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

export default function OwnerDashboard() {
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Ingresos del Mes
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.totalIncomeMonth)}</div>
                        <p className="text-xs text-muted-foreground">
                            Pagos recibidos este mes
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pagos Pendientes
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.pendingPaymentsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Recibos por cobrar
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
                            Últimos pagos recibidos de sus inmuebles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics.recentPayments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay pagos recientes.</p>
                            ) : (
                                metrics.recentPayments.map((payment: any) => (
                                    <div key={payment.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {payment.propertyName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(payment.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="font-medium">
                                            +{formatCurrency(payment.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Placeholder for future charts or notifications */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Estado General</CardTitle>
                        <CardDescription>
                            Resumen de inmuebles
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Inmuebles</span>
                                <span className="font-medium">{metrics.totalProperties}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Unidades</span>
                                <span className="font-medium">{metrics.totalUnits}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
