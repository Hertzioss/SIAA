import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface MaintenanceReportProps {
    data: any[]
}

/**
 * Reporte de mantenimiento.
 * Muestra el estado global de solicitudes y reparaciones mediante gráficas y tablas detalladas.
 */
export const MaintenanceReport = forwardRef<HTMLDivElement, MaintenanceReportProps>(({ data }, ref) => {

    // Process Data for Charts
    const statusCounts = data.reduce((acc: any, curr: any) => {
        const s = curr.status || 'pending'
        acc[s] = (acc[s] || 0) + 1
        return acc
    }, {})

    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const priorityCounts = data.reduce((acc: any, curr: any) => {
        const p = curr.priority || 'medium'
        acc[p] = (acc[p] || 0) + 1
        return acc
    }, {})

    const barData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }))


    return (
        <div ref={ref} className="p-8 bg-white min-h-screen text-black">
            <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider mb-1">Reporte de Mantenimiento</h2>
                <p className="text-sm text-gray-500">Estado global de solicitudes y reparaciones</p>
                <div className="text-xs text-gray-400 mt-2">
                    Generado el: {new Date().toLocaleDateString()}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Estado de Solicitudes</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Prioridad</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
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
