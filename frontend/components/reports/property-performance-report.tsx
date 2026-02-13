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
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface PropertyPerformanceProps {
    data: any[]
    period?: string
}

/**
 * Reporte de rendimiento por propiedad.
 * Ofrece un análisis comparativo de ingresos vs. egresos y calcula el margen de utilidad neta.
 */
export const PropertyPerformanceReport = forwardRef<HTMLDivElement, PropertyPerformanceProps>(({ data, period }, ref) => {

    const totalIncome = data.reduce((sum, item) => sum + item.income, 0)
    const totalExpense = data.reduce((sum, item) => sum + item.expense, 0)
    const totalNet = totalIncome - totalExpense

    return (
        <div ref={ref} className="p-8 bg-white min-h-screen text-black">
            <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider mb-1">Rendimiento por Propiedad</h2>
                <p className="text-sm text-gray-500">Análisis comparativo de Ingresos vs Egresos (USD)</p>
                {period && <p className="text-sm text-gray-500 font-medium mt-1 uppercase">{period}</p>}
                <div className="text-xs text-gray-400 mt-2">
                    Generado el: {new Date().toLocaleDateString()}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">$ {totalIncome.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Egresos Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">$ {totalExpense.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Neta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", totalNet >= 0 ? "text-primary" : "text-destructive")}>
                            $ {totalNet.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-none">
                <CardContent className="px-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 hover:bg-gray-100 border-b-2 border-gray-200">
                                <TableHead className="font-bold text-gray-700 w-[40%]">Propiedad</TableHead>
                                <TableHead className="font-bold text-gray-700 text-right">Ingresos</TableHead>
                                <TableHead className="font-bold text-gray-700 text-right">Egresos</TableHead>
                                <TableHead className="font-bold text-gray-700 text-right">Utilidad Neta</TableHead>
                                <TableHead className="font-bold text-gray-700 text-center">Margen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, idx) => {
                                const margin = item.income > 0 ? ((item.net / item.income) * 100).toFixed(1) : '0.0'
                                return (
                                    <TableRow key={idx} className="border-b border-gray-100">
                                        <TableCell className="font-medium">{item.property}</TableCell>
                                        <TableCell className="text-right text-green-600 font-mono">$ {item.income.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-red-500 font-mono">$ {item.expense.toLocaleString()}</TableCell>
                                        <TableCell className={cn("text-right font-bold font-mono", item.net >= 0 ? "text-gray-900" : "text-red-600")}>
                                            $ {item.net.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={parseFloat(margin) > 0 ? 'default' : 'destructive'} className="font-mono">
                                                {margin}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
})

PropertyPerformanceReport.displayName = "PropertyPerformanceReport"
