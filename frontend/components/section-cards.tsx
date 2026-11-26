"use client"

import Link from "next/link"
import { ArrowUpRight, Building2, Clock, TrendingDown, TrendingUp, Wallet, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardStats } from "@/hooks/use-dashboard-data"
import { cn, formatCurrency } from "@/lib/utils"

interface SectionCardsProps {
  stats: DashboardStats
}

/**
 * Tarjetas de indicadores clave (KPIs) del dashboard administrativo.
 * Muestra ingresos, egresos + balance neto, pagos pendientes por conciliar y ocupación real.
 */
export function SectionCards({ stats }: SectionCardsProps) {
  const netPositive = stats.netBalanceUSD >= 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* 1. Ingresos del período */}
      <Link href="/reports/owners" className="group block">
        <Card className="h-full transition-colors group-hover:border-emerald-500/40">
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Ingresos conciliados</span>
              <div className="flex items-center gap-1.5">
                {stats.revenueTrend !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                      stats.revenueTrend >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    )}
                  >
                    {stats.revenueTrend >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stats.revenueTrend >= 0 ? `+${stats.revenueTrend}%` : `${stats.revenueTrend}%`}
                  </span>
                )}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-2xl font-bold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatCurrency(stats.revenueUSD, 'USD')}
              </div>
              <div className="text-sm font-medium text-muted-foreground tabular-nums">
                {formatCurrency(stats.revenueBs, 'VES')}
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>Balance neto</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  netPositive ? "text-foreground" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {formatCurrency(stats.netBalanceUSD, 'USD')}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 2. Egresos del período */}
      <Link href="/expenses" className="group block">
        <Card className="h-full transition-colors group-hover:border-rose-500/40">
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Egresos registrados</span>
              <div className="flex items-center gap-1.5">
                {stats.expensesTrend !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                      stats.expensesTrend <= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    )}
                  >
                    {stats.expensesTrend >= 0 ? `+${stats.expensesTrend}%` : `${stats.expensesTrend}%`}
                  </span>
                )}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-2xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
                {formatCurrency(stats.expensesUSD, 'USD')}
              </div>
              <div className="text-sm font-medium text-muted-foreground tabular-nums">
                {formatCurrency(stats.expensesBs, 'VES')}
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>Relación egreso / ingreso</span>
              <span className="font-medium text-foreground tabular-nums">
                {stats.revenueUSD > 0
                  ? `${Math.round((stats.expensesUSD / stats.revenueUSD) * 100)}%`
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 3. Pagos por conciliar */}
      <Link href="/payments" className="group block">
        <Card
          className={cn(
            "h-full transition-colors",
            stats.pendingPaymentsCount > 0
              ? "border-amber-300/80 dark:border-amber-800/70 group-hover:border-amber-500"
              : "group-hover:border-primary/40"
          )}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Pagos por conciliar</span>
              <div className="flex items-center gap-1.5">
                {stats.pendingPaymentsCount > 0 ? (
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                )}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div
                className={cn(
                  "text-2xl font-bold tracking-tight tabular-nums",
                  stats.pendingPaymentsCount > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-foreground"
                )}
              >
                {stats.pendingPaymentsCount}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  {stats.pendingPaymentsCount === 1 ? 'pago' : 'pagos'}
                </span>
              </div>
              <div className="text-sm font-medium text-muted-foreground tabular-nums">
                {stats.pendingPaymentsCount > 0
                  ? `${formatCurrency(stats.pendingPaymentsUSD, 'USD')} en espera`
                  : 'Todo conciliado al día'}
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>Equivalente en Bs</span>
              <span className="font-medium text-foreground tabular-nums">
                {stats.pendingPaymentsCount > 0
                  ? formatCurrency(stats.pendingPaymentsBs, 'VES')
                  : 'Bs. 0,00'}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 4. Ocupación e Inmuebles */}
      <Link href="/properties" className="group block">
        <Card className="h-full transition-colors group-hover:border-primary/40">
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Ocupación del portafolio</span>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {stats.occupancyRate}%
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {stats.occupiedUnits} / {stats.totalUnits} unidades
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(Math.max(stats.occupancyRate, 0), 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between gap-2">
              <span className="tabular-nums">
                {stats.properties} {stats.properties === 1 ? 'inmueble' : 'inmuebles'} · {stats.vacantUnits} {stats.vacantUnits === 1 ? 'vacante' : 'vacantes'}
              </span>
              {stats.requests > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium tabular-nums shrink-0">
                  <Wrench className="h-3 w-3" />
                  {stats.requests}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
