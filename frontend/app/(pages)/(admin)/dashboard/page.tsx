"use client"

import { useState } from "react"
import { SectionCards } from "@/components/section-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import { DASHBOARD_DATA } from "./mock-data"
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

export default function Page() {
  const [selectedProperty, setSelectedProperty] = useState("all")
  const router = useRouter()

  // Helper to get current data safely
  const currentData = DASHBOARD_DATA[selectedProperty as keyof typeof DASHBOARD_DATA] || DASHBOARD_DATA.all

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          {selectedProperty !== "all" && currentData.id && (
            <Button
              variant="outline"
              onClick={() => router.push(`/properties/${currentData.id}`)}
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
                <SelectItem value="prop1">Torre Empresarial Norte</SelectItem>
                <SelectItem value="prop2">Centro Comercial El Valle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <SectionCards stats={currentData.stats} />

      <DashboardCharts
        paymentData={currentData.paymentData}
        arrearsData={currentData.arrearsData}
        revenueExpensesData={currentData.revenueExpensesData}
        occupancyData={currentData.occupancyData}
        leaseExpirations={currentData.leaseExpirations}
        recentActivity={currentData.recentActivity}
      />
    </div>
  )
}
