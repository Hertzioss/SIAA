"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getOwnerDashboardMetrics } from "@/actions/owner-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"

function DelinquencyReportContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    
    const month = searchParams.get('month') || 'all'
    const year = searchParams.get('year') || 'all'
    
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                router.push('/login')
                return
            }
            
            const result = await getOwnerDashboardMetrics(session.access_token, month, year)
            if (result.error) {
                console.error(result.error)
            } else {
                setData(result.data)
            }
            setLoading(false)
        }
        
        loadData()
    }, [month, year, router])
    
    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando reporte...</div>
    }
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    const periodName = month !== 'all' && year !== 'all' ? `${monthNames[parseInt(month) - 1]} ${year}` : 'Período General'
    
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 print:p-0 print:m-0 print:space-y-4 print:text-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/owners/dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Reporte de Morosidad</h2>
                        <p className="text-muted-foreground mt-1">Inquilinos con pagos pendientes en el período: <span className="font-semibold text-foreground">{periodName}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => window.print()} variant="outline" className="print:hidden">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inquilinos Morosos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-500">{data?.pendingPaymentsCount || 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Deuda Total (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-600 dark:text-rose-500">
                            ${(data?.pendingUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Deuda Promedio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-500">
                            ${data?.pendingPaymentsCount > 0 ? (data?.pendingUSD / data?.pendingPaymentsCount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm mt-8 border border-gray-200 print:shadow-none print:mt-4 print:border-gray-400">
                <div className="rounded-md overflow-hidden">
                    <Table className="print:text-xs">
                        <TableHeader>
                            <TableRow className="bg-gray-50 border-b-2 border-gray-300 dark:bg-muted/50 dark:border-muted print:bg-gray-100">
                                <TableHead className="font-bold text-gray-900 dark:text-gray-200">INQUILINO</TableHead>
                                <TableHead className="font-bold text-gray-900 dark:text-gray-200">INMUEBLE</TableHead>
                                <TableHead className="font-bold text-gray-900 dark:text-gray-200">UNIDAD</TableHead>
                                <TableHead className="text-right font-bold text-gray-900 dark:text-gray-200">CANON ADEUDADO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.delinquentTenants?.length > 0 ? (
                                data.delinquentTenants.map((tenant: any, idx: number) => (
                                    <TableRow key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-gray-50/50 dark:bg-muted/20"}>
                                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{tenant.tenantName}</TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-400">{tenant.propertyName}</TableCell>
                                        <TableCell className="font-medium">{tenant.unitName}</TableCell>
                                        <TableCell className="text-right text-rose-600 font-bold">
                                            ${tenant.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground font-medium">
                                        No se encontraron inquilinos con deuda pendiente para este período.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    )
}

export default function DelinquencyReportPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Cargando reporte...</div>}>
            <DelinquencyReportContent />
        </Suspense>
    )
}
