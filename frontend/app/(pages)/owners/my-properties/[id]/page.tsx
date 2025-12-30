"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getOwnerPropertyDetails } from "@/actions/owner-dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Building,
    MapPin,
    ArrowLeft,
    DollarSign,
    Wrench,
    Users,
    Calendar,
    FileText
} from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

export default function PropertyDetailPage() {
    const params = useParams()
    const id = params?.id as string
    const [property, setProperty] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return

            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                setError("No autorizado")
                setLoading(false)
                return
            }

            const { data, error } = await getOwnerPropertyDetails(id, session.access_token)

            if (error) {
                setError(error)
            } else {
                setProperty(data)
            }
            setLoading(false)
        }

        fetchDetails()
    }, [id])

    if (loading) return <div className="p-8">Cargando detalles...</div>
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>
    if (!property) return <div className="p-8">Propiedad no encontrada</div>

    // Calculations
    const totalUnits = property.units.length
    const occupiedUnits = property.units.filter((u: any) => u.status === 'occupied').length
    const vacancyRate = totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0

    // Flatten payments
    const allPayments = property.units.flatMap((u: any) =>
        u.contracts?.flatMap((c: any) =>
            c.payments?.map((p: any) => ({
                ...p,
                unitName: u.name,
                contractId: c.id
            })) || []
        ) || []
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Filter Expenses (already flattened in action)
    const allExpenses = property.expenses || []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
                    <Link href="/owners/my-properties">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a mis propiedades
                    </Link>
                </Button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {property.name}
                            <Badge variant="outline" className="ml-2 font-normal text-sm">
                                {property.type?.label}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4" /> {property.address}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unidades</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUnits}</div>
                        <p className="text-xs text-muted-foreground">Total de unidades</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{occupiedUnits}</div>
                        <p className="text-xs text-muted-foreground">
                            {vacancyRate.toFixed(1)}% Vacantes
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Participación</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{property.ownerPercentage}%</div>
                        <p className="text-xs text-muted-foreground">Su porcentaje de propiedad</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="units" className="w-full">
                <TabsList>
                    <TabsTrigger value="units">Unidades & Contratos</TabsTrigger>
                    <TabsTrigger value="financials">Finanzas</TabsTrigger>
                </TabsList>

                <TabsContent value="units" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado de Unidades</CardTitle>
                            <CardDescription>Detalle de ocupación y contratos vigentes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {property.units.map((unit: any) => (
                                    <div key={unit.id} className="flex flex-col md:flex-row justify-between p-4 border rounded-lg items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-lg">{unit.name}</h3>
                                                <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'}>
                                                    {unit.status === 'occupied' ? 'Ocupado' : unit.status === 'vacant' ? 'Vacante' : 'Mantenimiento'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Tipo: {unit.type}</p>
                                        </div>

                                        {unit.activeContract ? (
                                            <div className="text-sm text-right">
                                                <p className="font-medium">{unit.activeContract.tenant?.name}</p>
                                                <p className="text-muted-foreground">
                                                    Vence: {new Date(unit.activeContract.end_date).toLocaleDateString()}
                                                </p>
                                                <p className="font-semibold text-emerald-600">
                                                    {formatCurrency(unit.activeContract.rent_amount)} / mes
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground italic">
                                                Sin contrato activo
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="financials" className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" /> Historial de Pagos
                                </CardTitle>
                                <CardDescription>Últimos ingresos registrados.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px] overflow-y-auto pr-2">
                                <div className="space-y-4">
                                    {allPayments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
                                    ) : (
                                        allPayments.map((payment: any) => (
                                            <div key={payment.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                                <div>
                                                    <p className="font-medium text-sm">{payment.concept} ({payment.unitName})</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(payment.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-medium ${payment.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {formatCurrency(payment.amount)}
                                                    </span>
                                                    <p className="text-[10px] uppercase text-muted-foreground">{payment.status}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="h-5 w-5" /> Gastos y Mantenimiento
                                </CardTitle>
                                <CardDescription>Historial de egresos.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px] overflow-y-auto pr-2">
                                <div className="space-y-4">
                                    {allExpenses.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No hay gastos registrados.</p>
                                    ) : (
                                        allExpenses.map((expense: any) => (
                                            <div key={expense.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                                <div>
                                                    <p className="font-medium text-sm">{expense.description || expense.category}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(expense.date).toLocaleDateString()} - {expense.unitName}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-medium text-rose-600">
                                                        -{formatCurrency(expense.amount)}
                                                    </span>
                                                    <p className="text-[10px] uppercase text-muted-foreground">{expense.status}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
