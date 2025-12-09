'use client'

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
    Building,
    MapPin,
    Users,
    DollarSign,
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
    AlertTriangle,
    FileText,
    Calendar,
    Mail,
    Trash
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { usePropertyDetails } from "@/hooks/use-property-details"
import { useExpenses } from "@/hooks/use-expenses"
import { useMaintenance } from "@/hooks/use-maintenance"
import { supabase } from "@/lib/supabase"
import { useProperties } from "@/hooks/use-properties"
import { PropertyDialog } from "@/components/properties/property-dialog"

export default function PropertyDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const { propertyTypes, updateProperty } = useProperties()

    const {
        property,
        units,
        tenants,
        stats,
        expenses: propertyExpenses, // Rename to avoid conflict if needed, though useExpenses returns 'expenses'
        maintenance: propertyMaintenance,
        loading,
        refresh
    } = usePropertyDetails(params.id as string)

    // Expenses & Maintenance Hooks
    const {
        expenses,
        loading: loadingExpenses,
        createExpense,
        deleteExpense
    } = useExpenses(params.id as string)

    const {
        requests,
        loading: loadingMaintenance,
        createRequest,
        updateRequestStatus,
        deleteRequest
    } = useMaintenance(params.id as string)

    // UI State
    const [activeTab, setActiveTab] = useState("overview")
    const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false)

    // Add Unit Form State
    const [newUnitName, setNewUnitName] = useState("")
    const [newUnitType, setNewUnitType] = useState("apartment")
    const [newUnitStatus, setNewUnitStatus] = useState("vacant")
    const [newUnitArea, setNewUnitArea] = useState("")
    const [newUnitRent, setNewUnitRent] = useState("")
    const [newUnitFloor, setNewUnitFloor] = useState("")

    // Expense Form State
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
    const [isEditPropertyDialogOpen, setIsEditPropertyDialogOpen] = useState(false)
    const [expenseCategory, setExpenseCategory] = useState("maintenance")
    const [expenseDescription, setExpenseDescription] = useState("")
    const [expenseAmount, setExpenseAmount] = useState("")
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
    const [expenseStatus, setExpenseStatus] = useState("pending")

    // Maintenance Form State
    const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)
    const [maintenanceTitle, setMaintenanceTitle] = useState("")
    const [maintenanceDescription, setMaintenanceDescription] = useState("")
    const [maintenancePriority, setMaintenancePriority] = useState("medium")
    const [maintenanceUnitId, setMaintenanceUnitId] = useState("common")

    // Handlers
    const handleAddUnit = async () => {
        if (!newUnitName) {
            toast.error("El nombre de la unidad es requerido")
            return
        }

        const payload = {
            property_id: params.id,
            name: newUnitName,
            type: newUnitType,
            status: newUnitStatus,
            area: newUnitArea ? parseFloat(newUnitArea) : null,
            default_rent_amount: newUnitRent ? parseFloat(newUnitRent) : null,
            floor: newUnitFloor || null
        }

        console.log("Creating unit with payload:", payload)

        try {
            const { error } = await supabase
                .from('units')
                .insert(payload)

            if (error) {
                console.error("Supabase insert error:", error)
                throw error
            }

            toast.success("Unidad registrada exitosamente")
            setIsAddUnitDialogOpen(false)

            // Reset
            setNewUnitName("")
            setNewUnitType("apartment")
            setNewUnitStatus("vacant")
            setNewUnitArea("")
            setNewUnitRent("")
            setNewUnitFloor("")

            refresh()
        } catch (err: any) {
            console.error("Error creating unit:", err)
            toast.error("Error al crear unidad: " + (err.message || "Error desconocido"))
        }
    }

    const handleCreateExpense = async () => {
        if (!expenseDescription || !expenseAmount) {
            toast.error("Descripción y monto son requeridos")
            return
        }
        await createExpense({
            property_id: params.id as string,
            category: expenseCategory,
            description: expenseDescription,
            amount: parseFloat(expenseAmount),
            date: expenseDate,
            status: expenseStatus as any
        })
        setIsExpenseDialogOpen(false)
        setExpenseDescription("")
        setExpenseAmount("")
        toast.success("Gasto registrado")
    }

    const handleCreateMaintenance = async () => {
        if (!maintenanceTitle) {
            toast.error("El título es requerido")
            return
        }
        await createRequest({
            property_id: params.id as string,
            title: maintenanceTitle,
            description: maintenanceDescription,
            priority: maintenancePriority as any,
            status: 'open',
            unit_id: maintenanceUnitId === 'common' ? null : maintenanceUnitId
        })
        setIsMaintenanceDialogOpen(false)
        setMaintenanceTitle("")
        setMaintenanceDescription("")
        toast.success("Solicitud creada")
    }

    // Pagination State
    const [currentUnitsPage, setCurrentUnitsPage] = useState(1)
    const [currentTenantsPage, setCurrentTenantsPage] = useState(1)
    const ITEMS_PER_PAGE = 5
    const [searchTerm, setSearchTerm] = useState("")

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando detalles de la propiedad...</div>
    if (!property) return <div className="p-8 text-center text-muted-foreground">Propiedad no encontrada</div>

    // Filter units
    const filteredUnits = units.filter((unit: any) =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.tenant && unit.tenant.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Pagination Logic
    const totalUnitsPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE)
    const currentUnits = filteredUnits.slice(
        (currentUnitsPage - 1) * ITEMS_PER_PAGE,
        currentUnitsPage * ITEMS_PER_PAGE
    )

    const totalTenantsPages = Math.ceil(tenants.length / ITEMS_PER_PAGE)
    const currentTenants = tenants.slice(
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



    return (<div className="container mx-auto p-6 space-y-8">
        {/* Header - (Keeping existing header logic) */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Button variant="ghost" size="sm" className="pl-0 h-auto hover:bg-transparent" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                    </Button>
                    <span>/</span>
                    <span>Propiedades</span>
                    <span>/</span>
                    <span className="text-foreground font-medium">{property.name}</span>
                </div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
                    <Badge variant="outline" className="text-base font-normal">
                        {property.type}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {property.address}
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditPropertyDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
            </div>
        </div>

        <PropertyDialog
            open={isEditPropertyDialogOpen}
            onOpenChange={setIsEditPropertyDialogOpen}
            mode="edit"
            property={property}
            propertyTypes={propertyTypes}
            onSubmit={async (data) => {
                await updateProperty(property.id, data)
                refresh()
            }}
        />
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
                        Gestione los detalles de la unidad.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit-name" className="text-right">Nombre/N°</Label>
                        <Input id="unit-name" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="Ej. Apto 101" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit-type" className="text-right">Tipo</Label>
                        <Select value={newUnitType} onValueChange={setNewUnitType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="apartment">Apartamento</SelectItem>
                                <SelectItem value="office">Oficina</SelectItem>
                                <SelectItem value="local">Local</SelectItem>
                                <SelectItem value="storage">Bodega</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit-status" className="text-right">Estado</Label>
                        <Select value={newUnitStatus} onValueChange={setNewUnitStatus}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vacant">Vacante</SelectItem>
                                <SelectItem value="occupied">Ocupada</SelectItem>
                                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit-rent" className="text-right">Canon</Label>
                        <Input id="unit-rent" type="number" value={newUnitRent} onChange={e => setNewUnitRent(e.target.value)} placeholder="0.00" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit-area" className="text-right">Área</Label>
                        <Input id="unit-area" type="number" value={newUnitArea} onChange={e => setNewUnitArea(e.target.value)} placeholder="0.00" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit-floor" className="text-right">Piso</Label>
                        <Input id="unit-floor" value={newUnitFloor} onChange={e => setNewUnitFloor(e.target.value)} placeholder="Ej. 1" className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUnitDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddUnit}>Guardar Unidad</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUnits}</div>
                    <p className="text-xs text-muted-foreground">Espacios arrendables</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {units.filter((u: any) => u.status === 'Ocupado').length} ocupadas / {units.filter((u: any) => u.status === 'Vacante').length} vacantes
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Mes actual</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{requests.length}</div>
                    <p className="text-xs text-muted-foreground">Solicitudes totales</p>
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
                                                data={stats.paymentChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {stats.paymentChartData.map((entry: any, index: number) => (
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
                                            data={stats.arrearsChartData}
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
                                                {stats.arrearsChartData.map((entry: any, index: number) => (
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
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No hay alertas activas para esta propiedad.
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
                                {currentUnits.map((unit: any) => (
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => toast.info("Edición de unidad próximamente")}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toast.info("Historial de unidad próximamente")}>
                                                        <Clock className="mr-2 h-4 w-4" /> Ver Historial
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                                Página {currentUnitsPage} de {totalUnitsPages || 1}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentUnitsPage(prev => Math.min(prev + 1, totalUnitsPages))}
                                disabled={currentUnitsPage === totalUnitsPages || totalUnitsPages === 0}
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
                                {currentTenants.map((tenant: any) => (
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={() => router.push(`/contracts?q=${tenant.contractId}`)}
                                                        disabled={!tenant.contractId}
                                                    >
                                                        <FileText className="mr-2 h-4 w-4" /> Ver Contrato
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => toast.info("Funcionalidad de contacto próximamente")}>
                                                        <Mail className="mr-2 h-4 w-4" /> Contactar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                                Página {currentTenantsPage} de {totalTenantsPages || 1}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentTenantsPage(prev => Math.min(prev + 1, totalTenantsPages))}
                                disabled={currentTenantsPage === totalTenantsPages || totalTenantsPages === 0}
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
                            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" /> Registrar Gasto
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                                        <DialogDescription>
                                            Ingrese los detalles del gasto, servicio o reparación.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Categoría</Label>
                                                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                                        <SelectItem value="utilities">Servicios (Agua/Luz)</SelectItem>
                                                        <SelectItem value="tax">Impuestos</SelectItem>
                                                        <SelectItem value="maintenance">Limpieza</SelectItem>
                                                        <SelectItem value="other">Seguridad</SelectItem>
                                                        <SelectItem value="other">Otros</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Fecha</Label>
                                                <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Descripción</Label>
                                            <Input placeholder="Ej. Reparación tubería sótano" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Monto</Label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="pl-8" placeholder="0.00" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Estado de Pago</Label>
                                                <Select value={expenseStatus} onValueChange={setExpenseStatus}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pendiente</SelectItem>
                                                        <SelectItem value="paid">Pagado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleCreateExpense}>Guardar Gasto</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No hay gastos registrados.
                                        </TableCell>
                                    </TableRow>
                                ) : expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{expense.date}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{expense.category}</Badge>
                                        </TableCell>
                                        <TableCell>{expense.description}</TableCell>
                                        <TableCell>
                                            <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                                                {expense.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-red-600">
                                            -${expense.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => toast.info("Visualización de recibo próximamente")}>
                                                        <FileText className="mr-2 h-4 w-4" /> Ver Recibo
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => deleteExpense(expense.id)} className="text-red-600 focus:text-red-600">
                                                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                            <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" /> Nueva Solicitud
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Nueva Solicitud de Mantenimiento</DialogTitle>
                                        <DialogDescription>
                                            Cree un ticket para seguimiento de reparaciones o trabajos.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label>Título / Asunto</Label>
                                            <Input placeholder="Ej. Aire Acondicionado Ruidoso" value={maintenanceTitle} onChange={e => setMaintenanceTitle(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Prioridad</Label>
                                                <Select value={maintenancePriority} onValueChange={setMaintenancePriority}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Baja</SelectItem>
                                                        <SelectItem value="medium">Media</SelectItem>
                                                        <SelectItem value="high">Alta</SelectItem>
                                                        <SelectItem value="urgent">Urgente</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Unidad Afectada</Label>
                                                <Select value={maintenanceUnitId} onValueChange={setMaintenanceUnitId}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="common">Áreas Comunes</SelectItem>
                                                        {units.map((u: any) => (
                                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Descripción Detallada</Label>
                                            <Input placeholder="Describa el problema..." value={maintenanceDescription} onChange={e => setMaintenanceDescription(e.target.value)} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleCreateMaintenance}>Crear Solicitud</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
                                {requests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No hay solicitudes activas.
                                        </TableCell>
                                    </TableRow>
                                ) : requests.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.unit?.name || 'Áreas Comunes'}</TableCell>
                                        <TableCell>{item.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${getPriorityColor(item.priority)} border-0`}>
                                                {item.priority === 'low' ? 'Baja' : item.priority === 'medium' ? 'Media' : item.priority === 'high' ? 'Alta' : 'Urgente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Select defaultValue={item.status} onValueChange={(val) => updateRequestStatus(item.id, val)}>
                                                <SelectTrigger className="h-8 w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">Abierto</SelectItem>
                                                    <SelectItem value="in_progress">En Progreso</SelectItem>
                                                    <SelectItem value="resolved">Resuelto</SelectItem>
                                                    <SelectItem value="closed">Cerrado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{new Date(item.created_at!).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => toast.info("Edición próximamente")}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => deleteRequest(item.id)} className="text-red-600 focus:text-red-600">
                                                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
