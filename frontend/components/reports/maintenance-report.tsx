import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { forwardRef } from "react"

interface MaintenanceReportProps {
    data: any[]
    period?: string
}

/**
 * Reporte de mantenimiento.
 * Muestra el estado global de solicitudes y reparaciones mediante tablas detalladas.
 */
export const MaintenanceReport = forwardRef<HTMLDivElement, MaintenanceReportProps>(({ data, period }, ref) => {

    return (
        <div ref={ref} className="p-8 bg-white min-h-screen text-black">
            <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider mb-1">Reporte de Mantenimiento</h2>
                <p className="text-sm text-gray-500">Estado global de solicitudes y reparaciones</p>
                {period && <p className="text-sm text-gray-500 font-medium mt-1 uppercase">{period}</p>}
                <div className="text-xs text-gray-400 mt-2">
                    Generado el: {new Date().toLocaleDateString()}
                </div>
            </div>

            <Card className="border-0 shadow-none">
                <CardHeader className="px-0">
                    <CardTitle>Detalle de Solicitudes</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 hover:bg-gray-100">
                                <TableHead className="font-bold text-gray-700">Fecha</TableHead>
                                <TableHead className="font-bold text-gray-700">Propiedad</TableHead>
                                <TableHead className="font-bold text-gray-700">Asunto</TableHead>
                                <TableHead className="font-bold text-gray-700">Prioridad</TableHead>
                                <TableHead className="font-bold text-gray-700">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{item.properties?.name}</TableCell>
                                    <TableCell>{item.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.priority === 'high' ? 'destructive' : 'outline'}>
                                            {item.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
})

MaintenanceReport.displayName = "MaintenanceReport"
