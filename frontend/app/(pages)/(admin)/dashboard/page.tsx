"use client"

import { useState } from "react"
import { SectionCards } from "@/components/section-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import { PaymentDialog } from "@/components/tenants/payment-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Calendar, DollarSign, ExternalLink, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useProperties } from "@/hooks/use-properties"
import { useOwners } from "@/hooks/use-owners"

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-3.5 w-28 rounded bg-muted" />
              <div className="h-7 w-36 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="pt-2 border-t flex justify-between">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-[220px] w-full rounded bg-muted/60" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardContent className="p-5 space-y-3">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-28 w-full rounded bg-muted/60" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-7">
          <CardContent className="p-5 space-y-3">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-28 w-full rounded bg-muted/60" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Page() {
  const [selectedProperty, setSelectedProperty] = useState("all")
  const [selectedOwner, setSelectedOwner] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const router = useRouter()

  const { data, loading, refresh } = useDashboardData(
    selectedProperty,
    selectedOwner,
    selectedMonth,
    selectedYear
  )

  const { properties } = useProperties()
  const { owners } = useOwners()

  const filteredProperties = properties.filter((p) => {
    if (selectedOwner === "all") return true
    return p.owners?.some((o) => o.owner_id === selectedOwner)
  })

  return (
    <div className="container mx-auto px-4 md:px-6 py-2 space-y-5">
      {/* Header + Quick Action + Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Resumen financiero y operativo</h2>
            <p className="text-xs text-muted-foreground">
              Estado de cobros, egresos, ocupación y vencimientos del portafolio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedProperty !== "all" && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => router.push(`/properties/${selectedProperty}`)}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Ver inmueble
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setIsPaymentOpen(true)}
            >
              <DollarSign className="mr-1.5 h-4 w-4" />
              Registrar Pago
            </Button>
          </div>
        </div>

        {/* Compact Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-background border rounded-md px-2.5 h-9">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px] border-0 focus:ring-0 h-auto p-0 text-xs shadow-none">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
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

          <div className="flex items-center bg-background border rounded-md px-2.5 h-9">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[95px] border-0 focus:ring-0 h-auto p-0 text-xs shadow-none">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((yr) => (
                  <SelectItem key={yr} value={yr.toString()}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 bg-background border rounded-md px-2.5 h-9">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select
              value={selectedOwner}
              onValueChange={(val) => {
                setSelectedOwner(val)
                setSelectedProperty("all")
              }}
            >
              <SelectTrigger className="w-[180px] border-0 focus:ring-0 h-auto p-0 text-xs shadow-none">
                <SelectValue placeholder="Propietario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los propietarios</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 bg-background border rounded-md px-2.5 h-9">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[180px] border-0 focus:ring-0 h-auto p-0 text-xs shadow-none">
                <SelectValue placeholder="Inmueble" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los inmuebles</SelectItem>
                {filteredProperties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <SectionCards stats={data.stats} />
          <DashboardCharts
            revenueExpensesData={data.revenueExpensesData}
            leaseExpirations={data.leaseExpirations}
            recentActivity={data.recentActivity}
            expiredContractsCount={data.stats.expiredContractsCount}
          />
        </>
      )}

      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={(open) => {
          setIsPaymentOpen(open)
          if (!open) refresh()
        }}
        tenant={undefined}
        isAdmin={true}
      />
    </div>
  )
}
