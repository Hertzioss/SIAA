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
import { Building, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useProperties } from "@/hooks/use-properties"
import { useOwners } from "@/hooks/use-owners"

export default function Page() {
  const [selectedProperty, setSelectedProperty] = useState("all")
  const [selectedOwner, setSelectedOwner] = useState("all")
  const router = useRouter()
  
  // Pass both filters to hook
  const { data, loading } = useDashboardData(selectedProperty, selectedOwner)
  
  const { properties } = useProperties()
  const { owners } = useOwners()

  if (loading || !data) {
    return <div className="p-8 text-center text-muted-foreground">Cargando métricas...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Inicio</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
            {/* Owner Selector */}
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOwner} onValueChange={(val) => {
                setSelectedOwner(val)
                setSelectedProperty("all") // Reset property when owner changes to avoid mismatch
            }}>
                <SelectTrigger className="w-[200px] border-0 focus:ring-0 h-auto p-0">
                <SelectValue placeholder="Seleccionar Propietario" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos los Propietarios</SelectItem>
                {owners.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>

            {/* Property Selector */}
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-[200px] border-0 focus:ring-0 h-auto p-0">
                <SelectValue placeholder="Seleccionar Propiedad" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todas las Propiedades</SelectItem>
                {properties
                    // Optional: Filter properties by selected owner if desired, 
                    // or let backend/hook handle intersection.
                    // For better UX, let's filter the list here too if owner is selected.
                    .filter(p => {
                        if (selectedOwner === 'all') return true;
                        // We need to know which properties belong to owner to filter this list.
                        // detailed logic would require checking p.owner_id if available or join.
                        // The current useProperties hook returns minimal property data.
                        // Let's skip list filtering for now and just rely on data filtering.
                        return true; 
                    })
                    .map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>

            {selectedProperty !== "all" && (
                <Button
                variant="outline"
                onClick={() => router.push(`/properties/${selectedProperty}`)}
                >
                Ver Detalle
                </Button>
            )}
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
