import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, User, Mail, Phone, Plus, Trash2, FileText, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Tenant, TenantStatus } from "@/types/tenant"
import { Property } from "@/types/property"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentHistoryList } from "./payment-history-list"
import { Separator } from "@/components/ui/separator"
import { ContractDialog } from "@/components/contracts/contract-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTenantContacts, TenantContact } from "@/hooks/use-tenant-contacts"
import { useContracts } from "@/hooks/use-contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

interface TenantDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "view" | "edit"
    tenant?: Tenant
    properties: Property[]
    onSubmit?: (tenantData: any, contractData?: any) => Promise<void>
}

/**
 * Diálogo principal para la gestión de inquilinos.
 * Maneja información personal, creación de contratos iniciales, contactos y acceso (reset de contraseña).
 */
export function TenantDialog({ open, onOpenChange, mode, tenant, properties, onSubmit }: TenantDialogProps) {
    const [loading, setLoading] = useState(false)

    // Tenant Fields
    const [name, setName] = useState("")
    const [docId, setDocId] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [birthDate, setBirthDate] = useState("")
    const [status, setStatus] = useState<TenantStatus>("solvent")

    // Contract Fields (Only for create mode)
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
    const [selectedUnitId, setSelectedUnitId] = useState<string>("")
    const [contractType, setContractType] = useState<"residential" | "commercial">("residential")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [rentAmount, setRentAmount] = useState("")
    const [isIndefinite, setIsIndefinite] = useState(false)

    // Access Tab State
    const [showManualPassword, setShowManualPassword] = useState(false)
    const [manualPassword, setManualPassword] = useState("")

    // Hooks
    const { contacts, createContact, deleteContact, fetchContacts, isLoading: loadingContacts } = useTenantContacts(tenant?.id)
    const { contracts, fetchTenantContracts, createContract, updateContract } = useContracts()

    // Contract Dialog State
    const [isContractDialogOpen, setIsContractDialogOpen] = useState(false)
    const [contractDialogMode, setContractDialogMode] = useState<"create" | "edit" | "view">("create")
    const [selectedContract, setSelectedContract] = useState<any>(undefined)

    // New Contact Form State
    const [newContact, setNewContact] = useState<Partial<TenantContact>>({
        name: '',
        relation: 'family',
        phone: '',
        email: ''
    })

    useEffect(() => {
        if (open) {
            if ((mode === 'view' || mode === 'edit') && tenant) {
                setName(tenant.name || "")
                setDocId(tenant.doc_id || "")
                setEmail(tenant.email || "")
                setPhone(tenant.phone || "")
                setBirthDate(tenant.birth_date ? tenant.birth_date.split('T')[0] : "")
                setStatus(tenant.status)

                // Fetch related data
                fetchContacts()
                fetchTenantContracts(tenant.id)
            } else {
                resetForm()
            }
        }
    }, [open, mode, tenant, fetchContacts, fetchTenantContracts])

    const resetForm = () => {
        setName("")
        setDocId("")
        setEmail("")
        setPhone("")
        setBirthDate("")
        setStatus("solvent")

        setSelectedPropertyId("")
        setSelectedUnitId("")
        setContractType("residential")
        setStartDate("")
        setStartDate("")
        setEndDate("")
        setRentAmount("")
        setIsIndefinite(false)

        setNewContact({ name: '', relation: 'family', phone: '', email: '' })
    }

    const handleSubmit = async () => {
        const missingFields = []
        if (!name) missingFields.push("Nombre")
        if (!docId) missingFields.push("Documento")

        if (mode === 'create') {
            if (!selectedUnitId) missingFields.push("Unidad")
            if (!startDate) missingFields.push("Fecha Inicio")
            if (!isIndefinite && !endDate) missingFields.push("Fecha Fin")
            if (!rentAmount) missingFields.push("Canon Mensual")
        }

        if (missingFields.length > 0) {
            toast.error(`Por favor complete los campos obligatorios: ${missingFields.join(", ")}`)
            return
        }

        try {
            setLoading(true)
            const tenantData = {
                name,
                doc_id: docId,
                email: email || null,
                phone: phone || null,
                birth_date: birthDate || null,
                status
            }

            let contractData = null
            if (mode === 'create') {
                contractData = {
                    unit_id: selectedUnitId,
                    start_date: startDate,
                    end_date: isIndefinite ? null : endDate,
                    rent_amount: parseFloat(rentAmount),
                    type: contractType
                }
            }

            if (onSubmit) {
                await onSubmit(tenantData, contractData)
            }
            onOpenChange(false)
        } catch (error) {
            console.error("Error submitting tenant:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddContact = async () => {
        if (!tenant || !newContact.name) return

        const success = await createContact({
            tenant_id: tenant.id,
            name: newContact.name,
            relation: newContact.relation as any,
            phone: newContact.phone,
            email: newContact.email,
            is_primary: false
        })

        if (success) {
            setNewContact({ name: '', relation: 'family', phone: '', email: '' })
        }
    }

    const isView = mode === 'view'

    // Filter units based on selected property
    const selectedProperty = properties.find(p => p.id === selectedPropertyId)
    const availableUnits = selectedProperty?.units?.filter(u => u.status === 'vacant') || []

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<() => Promise<void> | void>()

    const handleResetPassword = () => {
        setPendingAction(() => async () => {
            if (!email || !tenant) return
            try {
                setLoading(true)
                const res = await fetch('/api/tenants/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, tenantId: tenant.id })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.details || data.error)
                toast.success("Contraseña restablecida y enviada por correo")
            } catch (err: any) {
                toast.error(err.message)
            } finally {
                setLoading(false)
                setConfirmOpen(false)
            }
        })
        setConfirmOpen(true)
    }

    const handleManualPassword = async () => {
        if (!email || !tenant || !manualPassword) return
        try {
            setLoading(true)
            const res = await fetch('/api/tenants/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, tenantId: tenant.id, password: manualPassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.details || data.error)
            toast.success("Contraseña actualizada manualmente")
            setShowManualPassword(false)
            setManualPassword("")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleContractSubmit = async (data: any) => {
        try {
            if (contractDialogMode === 'create' && tenant) {
                await createContract({
                    ...data,
                    tenant_id: tenant.id // Force tenant ID
                })
            } else if (contractDialogMode === 'edit' && selectedContract) {
                await updateContract(selectedContract.id, data)
            }
            if (tenant) fetchTenantContracts(tenant.id) // Refresh list
        } catch (error) {
            console.error("Error saving contract from tenant dialog:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' && 'Registrar Nuevo Inquilino'}
                        {mode === 'edit' && `Editar Inquilino${tenant?.name ? ` - ${tenant.name}` : ''}`}
                        {mode === 'view' && `Detalles del Inquilino${tenant?.name ? ` - ${tenant.name}` : ''}`}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Ingrese los datos personales y de contrato.'
                            : 'Gestione la información, contratos y contactos.'}
                    </DialogDescription>
                </DialogHeader>

                {mode === 'create' ? (
                    // Create Mode Form
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                placeholder="Ej. Carlos Ruiz"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="docId">Cédula / RIF</Label>
                                <Input
                                    id="docId"
                                    placeholder="V-12345678"
                                    value={docId}
                                    onChange={(e) => setDocId(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="birthDate">Fecha de Nacimiento (Opcional)</Label>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    placeholder="+58 412 1234567"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <Separator className="my-2" />
                        <h3 className="text-sm font-medium text-muted-foreground">Contrato Inicial</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Propiedad</Label>
                                <Select value={selectedPropertyId} onValueChange={(val) => {
                                    setSelectedPropertyId(val)
                                    setSelectedUnitId("")
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione propiedad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.map(prop => (
                                            <SelectItem key={prop.id} value={prop.id}>
                                                {prop.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Unidad (Solo vacantes)</Label>
                                <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!selectedPropertyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione unidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableUnits.length > 0 ? (
                                            availableUnits.map(unit => (
                                                <SelectItem key={unit.id} value={unit.id}>
                                                    {unit.name} ({unit.type})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>No hay unidades vacantes</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Tipo de Contrato</Label>
                                <Select value={contractType} onValueChange={(val: any) => setContractType(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="residential">Residencial</SelectItem>
                                        <SelectItem value="commercial">Comercial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rentAmount">Canon Mensual ($)</Label>
                                <Input
                                    id="rentAmount"
                                    type="number"
                                    placeholder="0.00"
                                    value={rentAmount}
                                    onChange={(e) => setRentAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">Fecha Inicio</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="endDate" className={isIndefinite ? "text-muted-foreground" : ""}>Fecha Fin</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="tenant-indefinite"
                                            checked={isIndefinite}
                                            onCheckedChange={(checked) => {
                                                setIsIndefinite(checked === true)
                                                if (checked === true) setEndDate("")
                                            }}
                                        />
                                        <label
                                            htmlFor="tenant-indefinite"
                                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Indefinido
                                        </label>
                                    </div>
                                </div>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    disabled={isIndefinite}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // View/Edit Mode with Tabs
                    <Tabs defaultValue="info" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="info">Info</TabsTrigger>
                            <TabsTrigger value="contracts">Contratos</TabsTrigger>
                            <TabsTrigger value="contacts">Contactos</TabsTrigger>
                            <TabsTrigger value="payments">Pagos</TabsTrigger>
                            <TabsTrigger value="access">Acceso</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="py-4 space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isView}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="docId">Cédula / RIF</Label>
                                    <Input
                                        id="docId"
                                        value={docId}
                                        onChange={(e) => setDocId(e.target.value)}
                                        disabled={isView}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        disabled={isView}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={isView}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isView}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Estado</Label>
                                <Select value={status} onValueChange={(val: TenantStatus) => setStatus(val)} disabled={isView}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="solvent">Solvente</SelectItem>
                                        <SelectItem value="delinquent">Moroso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="contracts" className="py-4 space-y-4">
                            <div className="flex justify-end mb-2">
                                <Button size="sm" onClick={() => {
                                    setContractDialogMode("create")
                                    setSelectedContract(undefined)
                                    setIsContractDialogOpen(true)
                                }}>
                                    <Plus className="mr-2 h-4 w-4" /> Asignar Propiedad / Crear Contrato
                                </Button>
                            </div>

                            {contracts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
                                    No hay contratos registrados.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {contracts.map(contract => (
                                        <Card key={contract.id}>
                                            <CardHeader className="py-3">
                                                <div className="flex justify-between items-center">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <FileText className="h-4 w-4" />
                                                        {contract.units?.name}
                                                    </CardTitle>
                                                    <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                                                        {contract.status === 'active' ? 'Vigente' : 'Finalizado'}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="py-3 text-sm grid grid-cols-2 gap-2">
                                                <div><span className="text-muted-foreground">Inicio:</span> {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: es })}</div>
                                                <div><span className="text-muted-foreground">Fin:</span> {contract.end_date ? format(new Date(contract.end_date), 'dd MMM yyyy', { locale: es }) : "Indefinido"}</div>
                                                <div className="col-span-2 mt-2 flex gap-2">
                                                    <Link href={`/contracts?view=${contract.id}`} className="flex-1">
                                                        <Button variant="outline" size="sm" className="w-full">Ver Detalles</Button>
                                                    </Link>
                                                    <Button variant="secondary" size="sm" onClick={() => {
                                                        setSelectedContract(contract)
                                                        setContractDialogMode("edit")
                                                        setIsContractDialogOpen(true)
                                                    }}>
                                                        Editar
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="contacts" className="py-4 space-y-4">
                            {/* Add Contact Form */}
                            {!isView && (
                                <div className="bg-muted/50 p-4 rounded-md space-y-3">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <User className="h-4 w-4" /> Agregar Persona de Contacto
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Nombre"
                                            value={newContact.name}
                                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                                        />
                                        <Select
                                            value={newContact.relation}
                                            onValueChange={(v: any) => setNewContact({ ...newContact, relation: v })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Relación" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="family">Familiar</SelectItem>
                                                <SelectItem value="partner">Pareja</SelectItem>
                                                <SelectItem value="worker">Trabajador</SelectItem>
                                                <SelectItem value="other">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            placeholder="Teléfono"
                                            value={newContact.phone}
                                            onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                                        />
                                        <Input
                                            placeholder="Email"
                                            value={newContact.email}
                                            onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                                        />
                                    </div>
                                    <Button size="sm" onClick={handleAddContact} disabled={!newContact.name || loading}>
                                        <Plus className="mr-2 h-4 w-4" /> Agregar
                                    </Button>
                                </div>
                            )}

                            {/* Contacts List */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Relación</TableHead>
                                            <TableHead>Teléfono</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingContacts ? (
                                            <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                                        ) : contacts.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin contactos adicionales.</TableCell></TableRow>
                                        ) : (
                                            contacts.map(contact => (
                                                <TableRow key={contact.id}>
                                                    <TableCell>{contact.name}</TableCell>
                                                    <TableCell>{contact.email || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize">
                                                            {contact.relation === 'family' ? 'Familiar' :
                                                                contact.relation === 'partner' ? 'Pareja' :
                                                                    contact.relation === 'worker' ? 'Trabajador' : 'Otro'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{contact.phone || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        {!isView && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => deleteContact(contact.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="payments" className="py-4">
                            {tenant && <PaymentHistoryList tenantId={tenant.id} />}
                        </TabsContent>

                        <TabsContent value="access" className="py-4 space-y-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Usuario (Email)</Label>
                                        <p className="font-medium">{email || "No registrado"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Estado</Label>
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${email ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                            <span className="text-sm">{email ? 'Vinculado' : 'Sin Email'}</span>
                                        </div>
                                    </div>
                                </div>

                                {showManualPassword ? (
                                    <div className="bg-muted p-4 rounded-md space-y-3">
                                        <Label>Nueva Contraseña Manual</Label>
                                        <Input
                                            value={manualPassword}
                                            onChange={e => setManualPassword(e.target.value)}
                                            placeholder="Escriba la nueva contraseña"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleManualPassword} disabled={!manualPassword || loading}>Guardar</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setShowManualPassword(false)}>Cancelar</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setShowManualPassword(true)} disabled={!email || isView}>
                                            Establecer Contraseña Manual
                                        </Button>
                                        <Button variant="secondary" className="text-destructive" onClick={handleResetPassword} disabled={!email || isView}>
                                            Resetear Contraseña (Email)
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                <DialogFooter>
                    {!isView && (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? 'Registrar Inquilino' : 'Guardar Cambios'}
                        </Button>
                    )}
                    {isView && (
                        <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                    )}
                </DialogFooter>
            </DialogContent>

            <ContractDialog
                open={isContractDialogOpen}
                onOpenChange={setIsContractDialogOpen}
                mode={contractDialogMode}
                contract={selectedContract}
                properties={properties}
                tenants={tenant ? [tenant] : []}
                onSubmit={handleContractSubmit}
            />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción restablecerá la contraseña del usuario.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (pendingAction) pendingAction() }}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    )
}
