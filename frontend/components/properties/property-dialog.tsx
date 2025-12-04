import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash } from "lucide-react"
import { toast } from "sonner"

// Mock owners for selection (In a real app, this would come from props or a hook)
const MOCK_OWNERS = [
    { id: "1", name: "Juan Pérez" },
    { id: "2", name: "Inversiones Los Andes C.A." },
    { id: "3", name: "Maria Rodriguez" },
    { id: "4", name: "Sucesión Rodriguez" },
    { id: "5", name: "Desarrollos Inmobiliarios Global S.A." },
]

interface PropertyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "view" | "edit"
    property?: any // Replace with proper type
}

export function PropertyDialog({ open, onOpenChange, mode, property }: PropertyDialogProps) {
    const [propertyType, setPropertyType] = useState("building")
    const [owners, setOwners] = useState<{ id: string, name: string, percentage: number }[]>([])
    const [selectedOwnerId, setSelectedOwnerId] = useState("")
    const [participation, setParticipation] = useState("")

    // Form fields
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
    const [area, setArea] = useState("")
    const [floors, setFloors] = useState("")
    const [description, setDescription] = useState("")

    // Building specific fields
    const [hasApts, setHasApts] = useState(false)
    const [aptsCount, setAptsCount] = useState("")
    const [hasOffices, setHasOffices] = useState(false)
    const [officesCount, setOfficesCount] = useState("")
    const [hasLocals, setHasLocals] = useState(false)
    const [localsCount, setLocalsCount] = useState("")
    const [hasStorage, setHasStorage] = useState(false)
    const [storageCount, setStorageCount] = useState("")

    // Standalone specific fields
    const [standaloneType, setStandaloneType] = useState("")

    useEffect(() => {
        if (open && property && (mode === 'view' || mode === 'edit')) {
            // Populate form with property data
            setName(property.name || "")
            setAddress(property.address || "")
            setPropertyType(property.type === 'Edificio' ? 'building' : 'standalone')
            // ... populate other fields as needed based on your data structure

            // Mocking owner data for edit/view
            if (mode === 'edit' || mode === 'view') {
                // In a real scenario, map property.owners
                setOwners([{ id: "1", name: "Juan Pérez", percentage: 100 }])
            }
        } else if (open && mode === 'create') {
            resetForm()
        }
    }, [open, mode, property])

    const resetForm = () => {
        setName("")
        setAddress("")
        setArea("")
        setFloors("")
        setDescription("")
        setPropertyType("building")
        setOwners([])
        setHasApts(false); setAptsCount("")
        setHasOffices(false); setOfficesCount("")
        setHasLocals(false); setLocalsCount("")
        setHasStorage(false); setStorageCount("")
        setStandaloneType("")
    }

    const handleAddOwner = () => {
        if (!selectedOwnerId || !participation) return
        if (owners.some(o => o.id === selectedOwnerId)) {
            toast.error("Este propietario ya ha sido agregado.")
            return
        }
        const owner = MOCK_OWNERS.find(o => o.id === selectedOwnerId)
        if (owner) {
            setOwners(prev => [...prev, { ...owner, percentage: Number(participation) }])
            setSelectedOwnerId("")
            setParticipation("")
        }
    }

    const removeOwner = (index: number) => {
        const newOwners = [...owners]
        newOwners.splice(index, 1)
        setOwners(newOwners)
    }

    const handleSave = () => {
        const totalPercentage = owners.reduce((acc, curr) => acc + curr.percentage, 0)
        if (owners.length > 0 && totalPercentage !== 100) {
            toast.error(`La participación total debe ser 100%. Actual: ${totalPercentage}%`)
            return
        }
        toast.success(mode === 'create' ? "Propiedad creada exitosamente" : "Propiedad actualizada exitosamente")
        onOpenChange(false)
    }

    const isView = mode === 'view'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' && 'Registrar Nueva Propiedad'}
                        {mode === 'edit' && 'Editar Propiedad'}
                        {mode === 'view' && 'Detalles de Propiedad'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'view'
                            ? 'Información detallada de la propiedad.'
                            : 'Complete los detalles de la propiedad, propietarios y características.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* TIPO DE PROPIEDAD */}
                    <div className="space-y-4">
                        <h4 className="font-medium leading-none">Tipo de Propiedad</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Clasificación</Label>
                                <Select value={propertyType} onValueChange={setPropertyType} disabled={isView}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="building">Edificio / Conjunto</SelectItem>
                                        <SelectItem value="standalone">Unidad Independiente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {propertyType === "standalone" && (
                                <div className="space-y-2">
                                    <Label>Tipo de Unidad</Label>
                                    <Select value={standaloneType} onValueChange={setStandaloneType} disabled={isView}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="office">Oficina</SelectItem>
                                            <SelectItem value="local">Local Comercial</SelectItem>
                                            <SelectItem value="warehouse">Galpón / Depósito</SelectItem>
                                            <SelectItem value="house">Casa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {propertyType === "building" && (
                            <div className="space-y-2">
                                <Label>Contiene (Selección Múltiple)</Label>
                                <div className="grid gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2 w-32">
                                            <Checkbox id="has-apts" checked={hasApts} onCheckedChange={(c) => setHasApts(!!c)} disabled={isView} />
                                            <label htmlFor="has-apts" className="text-sm font-medium leading-none">Apartamentos</label>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Cant."
                                            className="w-24 h-8"
                                            value={aptsCount}
                                            onChange={(e) => setAptsCount(e.target.value)}
                                            disabled={!hasApts || isView}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2 w-32">
                                            <Checkbox id="has-offices" checked={hasOffices} onCheckedChange={(c) => setHasOffices(!!c)} disabled={isView} />
                                            <label htmlFor="has-offices" className="text-sm font-medium leading-none">Oficinas</label>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Cant."
                                            className="w-24 h-8"
                                            value={officesCount}
                                            onChange={(e) => setOfficesCount(e.target.value)}
                                            disabled={!hasOffices || isView}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2 w-32">
                                            <Checkbox id="has-locals" checked={hasLocals} onCheckedChange={(c) => setHasLocals(!!c)} disabled={isView} />
                                            <label htmlFor="has-locals" className="text-sm font-medium leading-none">Locales</label>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Cant."
                                            className="w-24 h-8"
                                            value={localsCount}
                                            onChange={(e) => setLocalsCount(e.target.value)}
                                            disabled={!hasLocals || isView}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2 w-32">
                                            <Checkbox id="has-storage" checked={hasStorage} onCheckedChange={(c) => setHasStorage(!!c)} disabled={isView} />
                                            <label htmlFor="has-storage" className="text-sm font-medium leading-none">Depósitos</label>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Cant."
                                            className="w-24 h-8"
                                            value={storageCount}
                                            onChange={(e) => setStorageCount(e.target.value)}
                                            disabled={!hasStorage || isView}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* DATOS BASICOS */}
                    <div className="space-y-4">
                        <h4 className="font-medium leading-none">Datos Básicos</h4>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Identificador</Label>
                            <Input
                                id="name"
                                placeholder={propertyType === 'building' ? "Ej. Torre Empresarial Norte" : "Ej. Local 5-A Calle Real"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isView}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Dirección Completa</Label>
                            <Input
                                id="address"
                                placeholder="Ej. Av. Principal, Urb. El Valle"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                disabled={isView}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="area">Área Total (m²)</Label>
                                <Input
                                    id="area"
                                    type="number"
                                    placeholder="0.00"
                                    value={area}
                                    onChange={(e) => setArea(e.target.value)}
                                    disabled={isView}
                                />
                            </div>
                            {propertyType === "building" && (
                                <div className="space-y-2">
                                    <Label htmlFor="floors">Niveles / Pisos</Label>
                                    <Input
                                        id="floors"
                                        type="number"
                                        placeholder="1"
                                        value={floors}
                                        onChange={(e) => setFloors(e.target.value)}
                                        disabled={isView}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción y Características</Label>
                            <Textarea
                                id="description"
                                placeholder="Detalles adicionales, amenidades, etc."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isView}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* PROPIETARIOS */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium leading-none">Propietarios</h4>
                            <Badge variant="outline">{owners.reduce((acc, curr) => acc + curr.percentage, 0)}% Asignado</Badge>
                        </div>

                        {!isView && (
                            <div className="flex gap-2 items-end">
                                <div className="grid gap-2 flex-1">
                                    <Label>Propietario</Label>
                                    <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MOCK_OWNERS.map(owner => (
                                                <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2 w-24">
                                    <Label>% Part.</Label>
                                    <Input
                                        type="number"
                                        placeholder="%"
                                        value={participation}
                                        onChange={(e) => setParticipation(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleAddOwner} size="icon" variant="secondary">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {owners.length > 0 && (
                            <div className="border rounded-md p-2 space-y-2">
                                {owners.map((owner, index) => (
                                    <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm">
                                        <span>{owner.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{owner.percentage}%</Badge>
                                            {!isView && (
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeOwner(index)}>
                                                    <Trash className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    {!isView && (
                        <Button onClick={handleSave}>
                            {mode === 'create' ? 'Registrar Propiedad' : 'Guardar Cambios'}
                        </Button>
                    )}
                    {isView && (
                        <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
