import { Building, Users, DollarSign, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  stats: {
    revenue: number
    revenueTrend: number
    expenses: number
    expensesTrend: number
    properties: number
    propertiesTrend: number
    requests: number
    requestsTrend: string
  }
}

/**
 * Componente para mostrar tarjetas de métricas clave (KPIs).
 * Incluye ingresos, ocupación, conteo de propiedades y solicitudes.
 */
export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:grid-cols-4 md:grid-cols-2">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Ingresos Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${stats.revenue.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp className="mr-1 h-3 w-3" />
              +{stats.revenueTrend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Tendencia al alza <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Comparado con el mes anterior
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Egresos Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${stats.expenses.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-900/10">
              <TrendingDown className="mr-1 h-3 w-3" />
              {stats.expensesTrend}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-red-600">
            Gastos registrados <TrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Comparado con el mes anterior
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Propiedades Activas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.properties}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Building className="mr-1 h-3 w-3" />
              +{stats.propertiesTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Portafolio en crecimiento <Building className="size-4" />
          </div>
          <div className="text-muted-foreground">1 nueva este mes</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Solicitudes Pendientes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.requests}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertCircle className="mr-1 h-3 w-3" />
              {stats.requestsTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-yellow-600">
            Requiere acción <AlertCircle className="size-4" />
          </div>
          <div className="text-muted-foreground">Mantenimiento y quejas</div>
        </CardFooter>
      </Card>
    </div>
  )
}
