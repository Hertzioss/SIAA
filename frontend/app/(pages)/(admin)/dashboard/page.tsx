"use client"

import { useState } from "react"
import { SectionCards } from "@/components/section-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useProperties } from "@/hooks/use-properties"

export default function Page() {
  const [selectedProperty, setSelectedProperty] = useState("all")
  const router = useRouter()
  const { data, loading } = useDashboardData(selectedProperty)
  const { properties } = useProperties()

  if (loading || !data) {
    return <div className="p-8 text-center text-muted-foreground">Cargando métricas...</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 lg:p-6 md:p-4">
        <h2 className="text-2xl font-bold tracking-tight">Inicio</h2>
        <div className="flex items-center gap-2">
          {selectedProperty !== "all" && (
            <Button
              variant="outline"
              onClick={() => router.push(`/properties/${selectedProperty}`)}
            >
              Ver Detalle
            </Button>
          )}
          <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[200px] sm:w-[280px] border-0 focus:ring-0 h-auto p-0">
                <SelectValue placeholder="Seleccionar Propiedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Propiedades</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <SectionCards stats={data.stats} />

      <DashboardCharts
        paymentData={data.paymentData}
        arrearsData={data.arrearsData}
        revenueExpensesData={data.revenueExpensesData}
        occupancyData={data.occupancyData}
        leaseExpirations={data.leaseExpirations}
        recentActivity={data.recentActivity}
      />
    </div>
  )
}
