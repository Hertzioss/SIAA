'use client'

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
    Building,
    MapPin,
    Users,
    DollarSign,
    Home,
    Briefcase,
    Warehouse,
    ArrowLeft,
    Edit,
    Plus,
    Search,
    MoreHorizontal,
    CheckCircle2,
    AlertCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Activity,
    AlertTriangle,
    FileText,
    Calendar
} from "lucide-react"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts"

// Mock Data
const PROPERTY_DETAILS = {
    id: "1",
    name: "Torre Empresarial Norte",
    type: "Edificio",
    address: "Av. Principal, Urb. El Valle",
    description: "Edificio corporativo de 12 pisos con oficinas de lujo y locales comerciales en planta baja.",
    totalUnits: 12,
    occupancyRate: 85,
    totalRevenue: 15400,
    owners: ["Inversiones Los Andes C.A."],
    image: "/placeholder.svg"
}

const UNITS_DATA = [
    { id: "101", name: "Local PB-01", type: "Local Comercial", area: "85m²", status: "Ocupado", tenant: "Café Gourmet", rent: 1200 },
    { id: "102", name: "Local PB-02", type: "Local Comercial", area: "90m²", status: "Vacante", tenant: "-", rent: 1300 },
    { id: "201", name: "Oficina 2-A", type: "Oficina", area: "120m²", status: "Ocupado", tenant: "Tech Solutions Inc.", rent: 1800 },
    { id: "202", name: "Oficina 2-B", type: "Oficina", area: "120m²", status: "Ocupado", tenant: "Abogados & Asoc.", rent: 1800 },
    { id: "301", name: "Oficina 3-A", type: "Oficina", area: "120m²", status: "Mantenimiento", tenant: "-", rent: 1800 },
    { id: "302", name: "Oficina 3-B", type: "Oficina", area: "120m²", status: "Ocupado", tenant: "Consultora Financiera", rent: 1800 },
]

const TENANTS_DATA = [
    { id: "t1", name: "Café Gourmet", contact: "Juan Valdez", email: "juan@cafe.com", phone: "0414-1112233", unit: "Local PB-01", status: "Al día", leaseEnd: "2024-12-31" },
    { id: "t2", name: "Tech Solutions Inc.", contact: "Ana Silva", email: "ana@tech.com", phone: "0412-5556677", unit: "Oficina 2-A", status: "Al día", leaseEnd: "2025-06-30" },
    { id: "t3", name: "Abogados & Asoc.", contact: "Pedro Perez", email: "pedro@legal.com", phone: "0416-9998877", unit: "Oficina 2-B", status: "Atrasado", leaseEnd: "2024-11-15" },
    { id: "t4", name: "Consultora Financiera", contact: "Maria Lopez", email: "maria@finanzas.com", phone: "0424-3334455", unit: "Oficina 3-B", status: "Al día", leaseEnd: "2025-03-20" },
]

const MAINTENANCE_DATA = [
    { id: "m1", unit: "Oficina 3-A", issue: "Filtración en techo", priority: "Alta", status: "En Progreso", date: "2024-12-01" },
    { id: "m2", unit: "Local PB-01", issue: "Revisión aire acondicionado", priority: "Media", status: "Pendiente", date: "2024-12-03" },
    { id: "m3", unit: "Áreas Comunes", issue: "Limpieza de vidrios", priority: "Baja", status: "Completado", date: "2024-11-28" },
]

const EXPENSES_DATA = [
    { id: "e1", date: "2024-12-05", category: "Mantenimiento", description: "Reparación de ascensor", amount: 450.00, status: "Pagado" },
    { id: "e2", date: "2024-12-02", category: "Servicios", description: "Factura de Electricidad", amount: 1200.00, status: "Pagado" },
    { id: "e3", date: "2024-12-01", category: "Limpieza", description: "Insumos de limpieza", amount: 150.00, status: "Pendiente" },
    { id: "e4", date: "2024-11-28", category: "Seguridad", description: "Servicio de vigilancia Noviembre", amount: 800.00, status: "Pagado" },
]

const FINANCIAL_SUMMARY = {
    collected: 12500,
    pending: 2900,
    expenses: 4500,
    netIncome: 8000
}

// Mock Data for Charts
const PAYMENT_DATA = [
    { name: "Cobrado", value: 12500, color: "#22c55e" }, // green-500
    { name: "Por Cobrar", value: 2900, color: "#eab308" }, // yellow-500
    { name: "Atrasado", value: 1500, color: "#ef4444" }, // red-500
]

const ARREARS_DATA = [
    { name: "0 Meses", value: 83, count: 10 },
    { name: "1 Mes", value: 10, count: 2 },
    { name: "2 Meses", value: 5, count: 1 },
    { name: "3+ Meses", value: 2, count: 1 },
]

export default function PropertyDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const [activeTab, setActiveTab] = useState("overview")
    const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false)

    const handleAddUnit = () => {
        setIsAddUnitDialogOpen(false)
        toast.success("Unidad registrada exitosamente")
    }

    // Pagination State
    const [currentUnitsPage, setCurrentUnitsPage] = useState(1)
    const [currentTenantsPage, setCurrentTenantsPage] = useState(1)
    const ITEMS_PER_PAGE = 5
    const [searchTerm, setSearchTerm] = useState("")

    // Filter units based on search
    const filteredUnits = UNITS_DATA.filter(unit =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.tenant.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination Logic for Units
    const totalUnitsPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE)
    const currentUnits = filteredUnits.slice(
        (currentUnitsPage - 1) * ITEMS_PER_PAGE,
        currentUnitsPage * ITEMS_PER_PAGE
    )

    // Pagination Logic for Tenants
    const totalTenantsPages = Math.ceil(TENANTS_DATA.length / ITEMS_PER_PAGE)
    const currentTenants = TENANTS_DATA.slice(
        (currentTenantsPage - 1) * ITEMS_PER_PAGE,
        currentTenantsPage * ITEMS_PER_PAGE
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Ocupado": return "default"
            case "Vacante": return "secondary"
            case "Mantenimiento": return "destructive"
            default: return "outline"
        }
    }

    const getTenantStatusColor = (status: string) => {
        return status === "Al día" ? "text-green-600" : "text-red-600"
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Alta": return "text-red-600 bg-red-100 dark:bg-red-900/20"
            case "Media": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20"
            case "Baja": return "text-blue-600 bg-blue-100 dark:bg-blue-900/20"
            default: return "text-gray-600 bg-gray-100"
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Button variant="ghost" size="sm" className="pl-0 h-auto hover:bg-transparent" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                        </Button>
                        <span>/</span>
                        <span>Propiedades</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">{PROPERTY_DETAILS.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{PROPERTY_DETAILS.name}</h1>
                        <Badge variant="outline" className="text-base font-normal">
                            {PROPERTY_DETAILS.type}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {PROPERTY_DETAILS.address}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" /> Nueva Unidad
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agregar Nueva Unidad</DialogTitle>
                                <DialogDescription>
                                    Registre una nueva unidad arrendable en esta propiedad.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="unit-name">Nombre / Número</Label>
                                    <Input id="unit-name" placeholder="Ej. Apto 101, Local PB-05" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="unit-type">Tipo</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="apartment">Apartamento</SelectItem>
                                                <SelectItem value="office">Oficina</SelectItem>
                                                <SelectItem value="commercial">Local Comercial</SelectItem>
                                                <SelectItem value="warehouse">Galpón</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="unit-area">Área (m²)</Label>
                                        <Input id="unit-area" type="number" placeholder="80" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="unit-rent">Canon Estimado ($)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="unit-rent" type="number" className="pl-8" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddUnitDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddUnit}>Guardar Unidad</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{PROPERTY_DETAILS.totalUnits}</div>
                        <p className="text-xs text-muted-foreground">Espacios arrendables</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{PROPERTY_DETAILS.occupancyRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {UNITS_DATA.filter(u => u.status === 'Ocupado').length} ocupadas / {UNITS_DATA.filter(u => u.status === 'Vacante').length} vacantes
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${PROPERTY_DETAILS.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+2.5% vs mes anterior</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MAINTENANCE_DATA.filter(m => m.status !== 'Completado').length}</div>
                        <p className="text-xs text-muted-foreground">Solicitudes activas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="units">Unidades</TabsTrigger>
                    <TabsTrigger value="tenants">Inquilinos</TabsTrigger>
                    <TabsTrigger value="expenses">Gastos</TabsTrigger>
                    <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Financial Summary & Charts */}
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Estado Financiero y Morosidad</CardTitle>
                                <CardDescription>Resumen de cobros y antigüedad de deuda.</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                                    {/* Pie Chart: Payments */}
                                    <div className="flex flex-col items-center justify-center">
                                        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Pagos vs Deuda</h4>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={PAYMENT_DATA}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {PAYMENT_DATA.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: number) => `$${value.toLocaleString()}`}
                                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Bar Chart: Arrears */}
                                    <div className="flex flex-col items-center justify-center">
                                        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Antigüedad de Deuda (Inquilinos)</h4>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                layout="vertical"
                                                data={ARREARS_DATA}
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" unit="%" hide />
                                                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    formatter={(value: number, name: string, props: any) => [`${value}% (${props.payload.count} inq.)`, "Porcentaje"]}
                                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                                />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {ARREARS_DATA.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : index === 1 ? '#eab308' : '#ef4444'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Critical Alerts */}
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Alertas y Actividad</CardTitle>
                                <CardDescription>Atención requerida.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Lease Expiration Alert */}
                                    <div className="flex items-start gap-4 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                                        <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-sm">Contratos por Vencer</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                El contrato de <strong>Abogados & Asoc.</strong> vence el 15/11/2024.
                                            </p>
                                            <Button variant="link" size="sm" className="h-auto p-0 text-yellow-600 mt-2">Ver detalles</Button>
                                        </div>
                                    </div>

                                    {/* Urgent Maintenance Alert */}
                                    <div className="flex items-start gap-4 p-3 border rounded-lg bg-red-50 dark:bg-red-900/10">
                                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-sm">Mantenimiento Urgente</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Filtración reportada en <strong>Oficina 3-A</strong>. Requiere atención inmediata.
                                            </p>
                                            <Button variant="link" size="sm" className="h-auto p-0 text-red-600 mt-2">Gestionar</Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Units Tab */}
                <TabsContent value="units" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Inventario de Unidades</CardTitle>
                                    <CardDescription>Gestione las unidades, oficinas y depósitos de esta propiedad.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar unidad..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value)
                                            setCurrentUnitsPage(1)
                                        }}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre / N°</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Área</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Inquilino</TableHead>
                                        <TableHead className="text-right">Canon</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentUnits.map((unit) => (
                                        <TableRow key={unit.id}>
                                            <TableCell className="font-medium">{unit.name}</TableCell>
                                            <TableCell>{unit.type}</TableCell>
                                            <TableCell>{unit.area}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusColor(unit.status) as any}>
                                                    {unit.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{unit.tenant}</TableCell>
                                            <TableCell className="text-right">${unit.rent}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Units Pagination */}
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentUnitsPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentUnitsPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                    Página {currentUnitsPage} de {totalUnitsPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentUnitsPage(prev => Math.min(prev + 1, totalUnitsPages))}
                                    disabled={currentUnitsPage === totalUnitsPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tenants Tab */}
                <TabsContent value="tenants" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inquilinos Activos</CardTitle>
                            <CardDescription>Información de contacto y estado de cuenta.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Inquilino</TableHead>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead>Contacto</TableHead>
                                        <TableHead>Vencimiento Contrato</TableHead>
                                        <TableHead>Estado de Cuenta</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentTenants.map((tenant) => (
                                        <TableRow key={tenant.id}>
                                            <TableCell className="font-medium">{tenant.name}</TableCell>
                                            <TableCell>{tenant.unit}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{tenant.contact}</span>
                                                    <span className="text-muted-foreground text-xs">{tenant.phone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{tenant.leaseEnd}</TableCell>
                                            <TableCell>
                                                <div className={`flex items-center gap-2 ${getTenantStatusColor(tenant.status)}`}>
                                                    {tenant.status === 'Al día' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                                    <span className="font-medium">{tenant.status}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Ver Contrato</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Tenants Pagination */}
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentTenantsPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentTenantsPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                    Página {currentTenantsPage} de {totalTenantsPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentTenantsPage(prev => Math.min(prev + 1, totalTenantsPages))}
                                    disabled={currentTenantsPage === totalTenantsPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Registro de Gastos</CardTitle>
                                    <CardDescription>Control de egresos y pagos de servicios.</CardDescription>
                                </div>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" /> Registrar Gasto
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {EXPENSES_DATA.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{expense.date}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{expense.category}</Badge>
                                            </TableCell>
                                            <TableCell>{expense.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={expense.status === 'Pagado' ? 'default' : 'secondary'}>
                                                    {expense.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                -${expense.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon">
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Maintenance Tab */}
                <TabsContent value="maintenance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Mantenimiento</CardTitle>
                                    <CardDescription>Solicitudes y trabajos en curso.</CardDescription>
                                </div>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" /> Nueva Solicitud
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead>Problema</TableHead>
                                        <TableHead>Prioridad</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Fecha Reporte</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {MAINTENANCE_DATA.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.unit}</TableCell>
                                            <TableCell>{item.issue}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`${getPriorityColor(item.priority)} border-0`}>
                                                    {item.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === 'Completado' ? 'secondary' : 'default'}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{item.date}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Gestionar</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
