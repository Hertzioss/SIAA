"use client"

import Link from "next/link"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, Clock, Wrench } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import { DashboardData } from "@/hooks/use-dashboard-data"

interface DashboardChartsProps {
    revenueExpensesData: DashboardData['revenueExpensesData']
    leaseExpirations: DashboardData['leaseExpirations']
    recentActivity: DashboardData['recentActivity']
    expiredContractsCount: number
}

/**
 * Gráficos y paneles operativos del dashboard administrativo:
 * 1) Flujo de caja (Ingresos vs Egresos de los últimos 6 meses en USD)
 * 2) Próximos vencimientos de contratos + alerta de vencidos
 * 3) Actividad reciente (pagos y mantenimiento)
 */
export function DashboardCharts({
    revenueExpensesData,
    leaseExpirations,
    recentActivity,
    expiredContractsCount
}: DashboardChartsProps) {
    const hasChartData = revenueExpensesData.some((d) => d.ingresos > 0 || d.gastos > 0)

    return (
        <div className="space-y-4">
            {/* Cash Flow Chart (Last 6 Months) */}
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Flujo de caja — Últimos 6 meses</CardTitle>
                        <CardDescription className="text-xs">
                            Comparativa mensual de ingresos conciliados frente a egresos registrados (USD).
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="hidden sm:flex items-center gap-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                                Ingresos
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-xs bg-rose-400" />
                                Egresos
                            </span>
                        </div>
                        <Link
                            href="/reports"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                        >
                            Ver reportes
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    {hasChartData ? (
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={revenueExpensesData}
                                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                    barGap={6}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/70" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12 }}
                                        className="fill-muted-foreground"
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                        tick={{ fontSize: 11 }}
                                        className="fill-muted-foreground"
                                        tickFormatter={(v: number) =>
                                            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                                        }
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--muted)', opacity: 0.45 }}
                                        formatter={(value, name) => [
                                            formatCurrency(Number(value || 0), 'USD'),
                                            name === 'ingresos' ? 'Ingresos' : 'Egresos'
                                        ]}
                                        contentStyle={{
                                            backgroundColor: 'var(--popover)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '0.5rem',
                                            fontSize: '12px',
                                            color: 'var(--popover-foreground)'
                                        }}
                                    />
                                    <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={34} />
                                    <Bar dataKey="gastos" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={34} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                            Sin movimientos conciliados en los últimos 6 meses para este filtro.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Operational 2-Column Row: Expirations & Recent Activity */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* Lease Expirations (5 cols) */}
                <Card className="lg:col-span-5 flex flex-col">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                        <div>
                            <CardTitle className="text-base">Próximos vencimientos</CardTitle>
                            <CardDescription className="text-xs">
                                Contratos activos por vencer en los próximos 60 días.
                            </CardDescription>
                        </div>
                        <Link
                            href="/contracts"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                        >
                            Contratos
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-2.5 flex-1">
                        {expiredContractsCount > 0 && (
                            <Link
                                href="/contracts"
                                className="flex items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-800 hover:bg-rose-100/70 transition-colors dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span className="tabular-nums">
                                        {expiredContractsCount} {expiredContractsCount === 1 ? 'contrato vencido requiere renovación' : 'contratos vencidos requieren renovación'}
                                    </span>
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                            </Link>
                        )}

                        {leaseExpirations.length > 0 ? (
                            <div className="divide-y rounded-md border">
                                {leaseExpirations.map((item) => {
                                    const isUrgent = item.days <= 15
                                    const isSoon = item.days <= 30
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{item.tenant}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {item.property} — {item.unit} · {item.date}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "shrink-0 tabular-nums text-[11px]",
                                                    isUrgent
                                                        ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                                        : isSoon
                                                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                                            : "text-muted-foreground"
                                                )}
                                            >
                                                {item.days === 0 ? 'Vence hoy' : `${item.days} d`}
                                            </Badge>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed rounded-md">
                                <Calendar className="h-6 w-6 mb-2 opacity-40" />
                                <p className="text-xs">No hay contratos por vencer en los próximos 60 días.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity (7 cols) */}
                <Card className="lg:col-span-7 flex flex-col">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                        <div>
                            <CardTitle className="text-base">Actividad reciente</CardTitle>
                            <CardDescription className="text-xs">
                                Últimos pagos reportados y solicitudes de mantenimiento.
                            </CardDescription>
                        </div>
                        <Link
                            href="/payments"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                        >
                            Ver pagos
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {recentActivity.length > 0 ? (
                            <div className="divide-y rounded-md border">
                                {recentActivity.map((item, index) => {
                                    let formattedDate = "—"
                                    try {
                                        const parsedDate = parseLocalDate(item.date)
                                        if (!Number.isNaN(parsedDate.getTime())) {
                                            formattedDate = format(parsedDate, "dd MMM yyyy", { locale: es })
                                        }
                                    } catch {
                                        formattedDate = "—"
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={cn(
                                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                                        item.type === 'maintenance'
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                                            : item.status === 'success'
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                                                : item.status === 'destructive'
                                                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                                    )}
                                                >
                                                    {item.type === 'maintenance' ? (
                                                        <Wrench className="h-4 w-4" />
                                                    ) : item.status === 'success' ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : (
                                                        <Clock className="h-4 w-4" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                                        <span
                                                            className={cn(
                                                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                                                                item.status === 'success'
                                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                                    : item.status === 'destructive'
                                                                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                                            )}
                                                        >
                                                            {item.statusLabel}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {item.desc} · {formattedDate}
                                                        {item.rate ? ` · Tasa ${item.rate}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0 tabular-nums">
                                                {item.amountUSD ? (
                                                    <>
                                                        <div
                                                            className={cn(
                                                                "text-sm font-semibold",
                                                                item.status === 'success'
                                                                    ? "text-emerald-700 dark:text-emerald-400"
                                                                    : item.status === 'destructive'
                                                                        ? "text-rose-600 dark:text-rose-400 line-through"
                                                                        : "text-amber-700 dark:text-amber-400"
                                                            )}
                                                        >
                                                            {item.amountUSD}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {item.amount}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs font-medium text-muted-foreground">
                                                        {item.amount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground border border-dashed rounded-md">
                                Sin actividad reciente para el filtro seleccionado.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
