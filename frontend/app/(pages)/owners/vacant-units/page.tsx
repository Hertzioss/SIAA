"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getOwnerProperties } from "@/actions/owner-dashboard"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Printer, FileSpreadsheet, Building2, ExternalLink } from "lucide-react"

export default function VacantUnitsReportPage() {
    const router = useRouter()
    
    const [vacantUnits, setVacantUnits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadReport() {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { data, error } = await getOwnerProperties(session.access_token)
            
            if (data) {
                let allVacantUnits: any[] = []
                data.forEach((property: any) => {
                    if (property.units) {
                        property.units.forEach((unit: any) => {
                            if (unit.status === 'vacant') {
                                allVacantUnits.push({
                                    ...unit,
                                    propertyName: property.name,
                                    propertyId: property.id
                                })
                            }
                        })
                    }
                })
                
                // Sort by property name then unit name
                allVacantUnits.sort((a, b) => {
                    const propCompare = a.propertyName.localeCompare(b.propertyName)
                    if (propCompare !== 0) return propCompare
                    return a.name.localeCompare(b.name)
                })

                setVacantUnits(allVacantUnits)
            }
            setLoading(false)
        }
        
        loadReport()
    }, [])

    const handlePrint = () => {
        window.print()
    }

    const handleExportCSV = () => {
        const headers = ["Inmueble", "Unidad", "Tipo"]
        const csvContent = [
            headers.join(","),
            ...vacantUnits.map(u => [
                `"${u.propertyName || ''}"`,
                `"${u.name || ''}"`,
                `"${u.type || ''}"`,
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `reporte_unidades_vacantes.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 print:p-0 print:m-0 print:space-y-4 print:text-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/owners/dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Unidades Vacantes</h2>
                        <p className="text-muted-foreground mt-1">
                            Listado de unidades actualmente sin inquilino activo
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : vacantUnits.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center print:shadow-none">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin Unidades Vacantes</p>
                    <p className="text-sm text-gray-500 mt-1">Todas las unidades en tus inmuebles se encuentran ocupadas actualmente.</p>
                </Card>
            ) : (
                <>
                    <Card className="shadow-sm mt-8 border border-gray-200 print:shadow-none print:mt-4 print:border-gray-400">
                        <div className="rounded-md overflow-hidden">
                            <Table className="print:text-xs">
                                <TableHeader>
                                    <TableRow className="bg-gray-50 border-b-2 border-gray-300 dark:bg-muted/50 dark:border-muted print:bg-gray-100">
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">INMUEBLE</TableHead>
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">UNIDAD</TableHead>
                                        <TableHead className="font-bold text-gray-900 dark:text-gray-200">TIPO DE UNIDAD</TableHead>
                                        <TableHead className="text-right font-bold text-gray-900 dark:text-gray-200 print:hidden">ACCIÓN</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vacantUnits.map((unit) => {
                                        return (
                                            <TableRow key={unit.id} className="border-b border-gray-200 dark:border-muted print:border-gray-300">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground print:hidden" />
                                                        {unit.propertyName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                                                    {unit.name}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {unit.type === 'apartment' ? 'Apartamento' :
                                                     unit.type === 'house' ? 'Casa' :
                                                     unit.type === 'commercial' ? 'Local Comercial' :
                                                     unit.type === 'office' ? 'Oficina' :
                                                     unit.type === 'room' ? 'Habitación' :
                                                     unit.type === 'warehouse' ? 'Depósito' :
                                                     unit.type || 'No especificado'}
                                                </TableCell>
                                                <TableCell className="text-right print:hidden">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-blue-600 hover:text-blue-800"
                                                        onClick={() => router.push(`/owners/my-properties/${unit.propertyId}`)}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Ver Inmueble
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}
