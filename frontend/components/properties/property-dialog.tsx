import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Property, PropertyType, PropertyOwnerReference } from "@/types/property"
import { Loader2, Plus, Trash, User } from "lucide-react"
import { useOwners } from "@/hooks/use-owners"

interface PropertyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "view" | "edit"
    property?: Property
    propertyTypes: PropertyType[]
    onSubmit?: (data: any) => Promise<void>
}

export function PropertyDialog({ open, onOpenChange, mode, property, propertyTypes, onSubmit }: PropertyDialogProps) {
    const [loading, setLoading] = useState(false)
    const { owners: availableOwners, fetchOwners } = useOwners()

    // Form fields
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
    const [propertyTypeId, setPropertyTypeId] = useState("")
    const [area, setArea] = useState("")
    const [floors, setFloors] = useState("")
    const [description, setDescription] = useState("")

    // Owners Management
    const [currentOwners, setCurrentOwners] = useState<PropertyOwnerReference[]>([])
    const [selectedOwnerId, setSelectedOwnerId] = useState("")
    const [percentage, setPercentage] = useState("")

    useEffect(() => {
        if (open) {
            fetchOwners(); // Load available owners for the dropdown
            if ((mode === 'view' || mode === 'edit') && property) {
                // Populate form with property data
                setName(property.name || "")
                setAddress(property.address || "")
                setPropertyTypeId(property.property_type_id || "")
                setArea(property.total_area?.toString() || "")
                setFloors(property.floors?.toString() || "")
                setDescription(property.description || "")
                setCurrentOwners(property.owners || [])
            } else {
                resetForm()
            }
        }
    }, [open, mode, property, fetchOwners])

    const resetForm = () => {
        setName("")
        setAddress("")
        setArea("")
        setFloors("")
        setDescription("")
        setPropertyTypeId("")
        setCurrentOwners([])
        setSelectedOwnerId("")
        setPercentage("")
    }

    const handleAddOwner = () => {
        if (!selectedOwnerId) return;

        const ownerToAdd = availableOwners.find(o => o.id === selectedOwnerId);
        if (!ownerToAdd) return;

        // Check for duplicates
        if (currentOwners.some(o => o.owner_id === selectedOwnerId)) {
            toast.error("Este propietario ya está asignado");
            return;
        }

        const newRef: PropertyOwnerReference = {
            owner_id: selectedOwnerId,
            name: ownerToAdd.name,
            participation_percentage: percentage ? parseFloat(percentage) : 0
        };

        setCurrentOwners([...currentOwners, newRef]);
        setSelectedOwnerId("");
        setPercentage("");
    }

    const handleRemoveOwner = (ownerId: string) => {
        setCurrentOwners(currentOwners.filter(o => o.owner_id !== ownerId));
    }

    const handleSubmit = async () => {
        if (!name || !address || !propertyTypeId) {
            toast.error("Nombre, dirección y tipo son obligatorios")
            return
        }

        try {
            setLoading(true)
            const propertyData = {
                name,
                address,
                property_type_id: propertyTypeId,
                total_area: area ? parseFloat(area) : null,
                floors: floors ? parseInt(floors) : null,
                description,
                owners: currentOwners
            }

            if (onSubmit) {
                await onSubmit(propertyData)
            }
            onOpenChange(false)
        } catch (error) {
            console.error("Error submitting form:", error)
            // Error handling is usually done in the hook/parent
        } finally {
            setLoading(false)
        }
    }

    const isView = mode === 'view'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' && 'Registrar Nueva Propiedad'}
                        {mode === 'edit' && 'Editar Propiedad'}
                        {mode === 'view' && 'Detalles de Propiedad'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'view'
                            ? 'Información detallada de la propiedad.'
                            : 'Complete los detalles de la propiedad y sus propietarios.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* TIPO DE PROPIEDAD */}
                    <div className="space-y-4">
                        <h4 className="font-medium leading-none">Tipo de Propiedad</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Clasificación</Label>
                                <Select
                                    value={propertyTypeId}
                                    onValueChange={setPropertyTypeId}
                                    disabled={isView}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {propertyTypes?.map(type => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* DATOS BASICOS */}
                    <div className="space-y-4">
                        <h4 className="font-medium leading-none">Datos Básicos</h4>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Identificador</Label>
                            <Input
                                id="name"
                                placeholder="Ej. Torre Empresarial Norte"
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
                        <h4 className="font-medium leading-none flex items-center gap-2">
                            <User className="h-4 w-4" /> Propietarios
                        </h4>

                        {!isView && (
                            <div className="flex items-end gap-2 p-4 bg-secondary/20 rounded-lg">
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs">Propietario</Label>
                                    <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableOwners.map(owner => (
                                                <SelectItem key={owner.id} value={owner.id}>
                                                    {owner.name} ({owner.doc_id})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 w-24">
                                    <Label className="text-xs">% Participación</Label>
                                    <Input
                                        type="number"
                                        placeholder="%"
                                        value={percentage}
                                        onChange={(e) => setPercentage(e.target.value)}
                                    />
                                </div>
                                <Button size="icon" onClick={handleAddOwner} type="button">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            {currentOwners.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic text-center py-2">
                                    Sin propietarios asignados.
                                </p>
                            ) : (
                                currentOwners.map((owner) => (
                                    <div key={owner.owner_id} className="flex justify-between items-center p-3 border rounded-md bg-card">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{owner.name}</p>
                                                {!isView ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-muted-foreground">Participación:</span>
                                                        <Input
                                                            type="number"
                                                            className="h-6 w-20 text-xs"
                                                            value={owner.participation_percentage}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0
                                                                setCurrentOwners(prev => prev.map(o =>
                                                                    o.owner_id === owner.owner_id
                                                                        ? { ...o, participation_percentage: val }
                                                                        : o
                                                                ))
                                                            }}
                                                        />
                                                        <span className="text-xs text-muted-foreground">%</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">{owner.participation_percentage}% Participación</p>
                                                )}
                                            </div>
                                        </div>
                                        {!isView && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 ml-2"
                                                onClick={() => handleRemoveOwner(owner.owner_id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    {!isView && (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

