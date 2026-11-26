"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Property, PropertyType, PropertyOwnerReference } from "@/types/property"
import {
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MapPin,
    Layers,
    Maximize2,
    Plus,
    Scale,
    Trash2,
    Users,
} from "lucide-react"
import { useOwners } from "@/hooks/use-owners"

export type PropertySubmitData = {
    name: string
    address: string
    property_type_id: string
    total_area: number | null
    floors: number | null
    description: string
    owners: PropertyOwnerReference[]
}

interface PropertyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "view" | "edit"
    property?: Property
    propertyTypes: PropertyType[]
    onSubmit?: (data: PropertySubmitData) => Promise<void>
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "PR"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Diálogo para la gestión de inmuebles.
 * Permite registrar, editar y ver detalles de inmuebles, incluyendo distribución de propietarios.
 */
export function PropertyDialog({
    open,
    onOpenChange,
    mode,
    property,
    propertyTypes,
    onSubmit,
}: PropertyDialogProps) {
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

    const totalPercentage = currentOwners.reduce(
        (sum, owner) => sum + (Number(owner.participation_percentage) || 0),
        0
    )
    const remainingPercentage = Math.max(0, Math.round((100 - totalPercentage) * 100) / 100)
    const isTotalValid = currentOwners.length === 0 || Math.abs(totalPercentage - 100) < 0.05

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

    useEffect(() => {
        if (open) {
            fetchOwners()
            if ((mode === "view" || mode === "edit") && property) {
                setName(property.name || "")
                setAddress(property.address || "")
                setPropertyTypeId(property.property_type_id || "")
                setArea(property.total_area != null ? property.total_area.toString() : "")
                setFloors(property.floors != null ? property.floors.toString() : "")
                setDescription(property.description || "")
                setCurrentOwners(property.owners || [])
                setSelectedOwnerId("")
                setPercentage("")
            } else {
                resetForm()
            }
        }
    }, [open, mode, property, fetchOwners])

    const handleOwnerSelect = (ownerId: string) => {
        setSelectedOwnerId(ownerId)
        if (!percentage && remainingPercentage > 0) {
            setPercentage(String(remainingPercentage))
        }
    }

    const handleAddOwner = () => {
        if (!selectedOwnerId) return

        const ownerToAdd = availableOwners.find((o) => o.id === selectedOwnerId)
        if (!ownerToAdd) return

        if (currentOwners.some((o) => o.owner_id === selectedOwnerId)) {
            toast.error("Este propietario ya está asignado")
            return
        }

        const parsedPct = percentage ? parseFloat(percentage) : remainingPercentage

        const newRef: PropertyOwnerReference = {
            owner_id: selectedOwnerId,
            name: ownerToAdd.name,
            participation_percentage: Number.isFinite(parsedPct) ? parsedPct : 0,
        }

        setCurrentOwners([...currentOwners, newRef])
        setSelectedOwnerId("")
        setPercentage("")
    }

    const handleRemoveOwner = (ownerId: string) => {
        setCurrentOwners((prev) => prev.filter((o) => o.owner_id !== ownerId))
    }

    const handleSplitEqually = () => {
        if (currentOwners.length === 0) return
        const base = Math.floor((10000 / currentOwners.length)) / 100
        const remainder = Math.round((100 - base * currentOwners.length) * 100) / 100
        setCurrentOwners((prev) =>
            prev.map((o, idx) => ({
                ...o,
                participation_percentage:
                    idx === 0 ? Math.round((base + remainder) * 100) / 100 : base,
            }))
        )
    }

    const handleSubmit = async () => {
        if (!name.trim() || !address.trim() || !propertyTypeId) {
            toast.error("Nombre, dirección y clasificación son obligatorios")
            return
        }

        if (currentOwners.length > 0 && Math.abs(totalPercentage - 100) > 0.1) {
            toast.error(
                `El porcentaje total de participación debe ser 100%. Actual: ${totalPercentage.toFixed(2)}%`
            )
            return
        }

        try {
            setLoading(true)
            const propertyData: PropertySubmitData = {
                name: name.trim(),
                address: address.trim(),
                property_type_id: propertyTypeId,
                total_area: area ? parseFloat(area) : null,
                floors: floors ? parseInt(floors, 10) : null,
                description: description.trim(),
                owners: currentOwners,
            }

            if (onSubmit) {
                await onSubmit(propertyData)
            }
            onOpenChange(false)
        } catch (error) {
            console.error("Error submitting form:", error)
        } finally {
            setLoading(false)
        }
    }

    const isView = mode === "view"
    const isCreate = mode === "create"
    const selectedTypeLabel =
        propertyTypes.find((t) => t.id === propertyTypeId)?.label ||
        property?.property_type?.label ||
        "Sin clasificar"

    const unassignedOwners = availableOwners.filter(
        (o) => !currentOwners.some((assigned) => assigned.owner_id === o.id)
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[840px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
                {/* Fixed Header */}
                <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0 text-left">
                    <div className="flex items-center gap-3 pr-8">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <DialogTitle className="text-lg truncate">
                                    {isCreate && "Registrar Nuevo Inmueble"}
                                    {mode === "edit" && `Editar Inmueble${property?.name ? ` — ${property.name}` : ""}`}
                                    {isView && (property?.name || "Detalles del Inmueble")}
                                </DialogTitle>
                                {!isCreate && selectedTypeLabel && (
                                    <Badge variant="outline" className="text-[11px] font-medium">
                                        {selectedTypeLabel}
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription className="text-xs mt-0.5">
                                {isView
                                    ? "Información general, dimensiones y distribución de propiedad."
                                    : "Completa los datos generales del inmueble y asigna la participación de propietarios."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {isView ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="rounded-lg border bg-card p-4 space-y-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Ficha del Inmueble
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Dirección</p>
                                        <p className="font-medium mt-0.5 flex items-start gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <span>{address || "No registrada"}</span>
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="rounded-md bg-muted/30 p-2.5">
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <Maximize2 className="h-3 w-3" /> Área Total
                                            </p>
                                            <p className="text-sm font-semibold tabular-nums mt-0.5">
                                                {area ? `${Number(area).toLocaleString("es-VE")} m²` : "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-md bg-muted/30 p-2.5">
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <Layers className="h-3 w-3" /> Niveles / Pisos
                                            </p>
                                            <p className="text-sm font-semibold tabular-nums mt-0.5">
                                                {floors || "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Descripción</p>
                                        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-line">
                                            {description || (
                                                <span className="text-muted-foreground italic">
                                                    Sin descripción adicional.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-card p-4 space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5" />
                                        Propietarios ({currentOwners.length})
                                    </h4>
                                    {currentOwners.length > 0 && (
                                        <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {totalPercentage.toFixed(0)}% asignado
                                        </span>
                                    )}
                                </div>

                                {currentOwners.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic py-6 text-center border border-dashed rounded-md">
                                        Sin propietarios asignados.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {currentOwners.map((owner) => (
                                            <div
                                                key={owner.owner_id}
                                                className="flex items-center justify-between p-2.5 rounded-md border bg-muted/20"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                                                        {getInitials(owner.name)}
                                                    </div>
                                                    <span className="text-sm font-medium truncate">
                                                        {owner.name}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="tabular-nums font-semibold"
                                                >
                                                    {owner.participation_percentage}%
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* CREATE / EDIT 2-COLUMN FORM */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Left Column: Core Data */}
                            <div className="lg:col-span-7 rounded-lg border bg-card p-4 space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-semibold">Datos del Inmueble</h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="prop-name" className="text-xs">
                                            Nombre Identificador *
                                        </Label>
                                        <Input
                                            id="prop-name"
                                            placeholder="Ej. Torre Empresarial Norte"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Clasificación *</Label>
                                        <Select
                                            value={propertyTypeId}
                                            onValueChange={setPropertyTypeId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar tipo..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {propertyTypes?.map((type) => (
                                                    <SelectItem key={type.id} value={type.id}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="prop-address" className="text-xs">
                                        Dirección Completa *
                                    </Label>
                                    <div className="relative">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            id="prop-address"
                                            className="pl-9"
                                            placeholder="Ej. Av. Principal, Urb. El Valle"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="prop-area" className="text-xs">
                                            Área Total (m²)
                                        </Label>
                                        <Input
                                            id="prop-area"
                                            type="number"
                                            step="0.01"
                                            className="tabular-nums"
                                            placeholder="0.00"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="prop-floors" className="text-xs">
                                            Niveles / Pisos
                                        </Label>
                                        <Input
                                            id="prop-floors"
                                            type="number"
                                            className="tabular-nums"
                                            placeholder="1"
                                            value={floors}
                                            onChange={(e) => setFloors(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="prop-description" className="text-xs">
                                        Descripción y Características
                                    </Label>
                                    <Textarea
                                        id="prop-description"
                                        rows={3}
                                        className="resize-none text-sm"
                                        placeholder="Detalles adicionales, amenidades, referencias..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Owners & Participation */}
                            <div className="lg:col-span-5 rounded-lg border bg-card p-4 flex flex-col gap-3.5">
                                <div className="flex items-center justify-between pb-1.5 border-b">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <h4 className="text-sm font-semibold">Propietarios</h4>
                                    </div>
                                    {currentOwners.length > 1 && !isTotalValid && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[11px] text-primary"
                                            onClick={handleSplitEqually}
                                        >
                                            <Scale className="mr-1 h-3 w-3" />
                                            Repartir igual
                                        </Button>
                                    )}
                                </div>

                                {/* Add Owner Controls */}
                                <div className="rounded-md bg-muted/30 border p-3 space-y-2.5">
                                    <div className="grid gap-1.5">
                                        <Label className="text-[11px] text-muted-foreground">
                                            Agregar propietario
                                        </Label>
                                        <Select
                                            value={selectedOwnerId}
                                            onValueChange={handleOwnerSelect}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-background">
                                                <SelectValue placeholder="Seleccionar propietario..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {unassignedOwners.length === 0 ? (
                                                    <SelectItem value="none" disabled>
                                                        No hay más propietarios disponibles
                                                    </SelectItem>
                                                ) : (
                                                    unassignedOwners.map((owner) => (
                                                        <SelectItem key={owner.id} value={owner.id}>
                                                            {owner.name} ({owner.doc_id})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="h-8 text-xs pr-6 bg-background tabular-nums"
                                                placeholder={
                                                    remainingPercentage > 0
                                                        ? `Sugerido: ${remainingPercentage}`
                                                        : "0"
                                                }
                                                value={percentage}
                                                onChange={(e) => setPercentage(e.target.value)}
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                %
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 text-xs px-3"
                                            onClick={handleAddOwner}
                                            disabled={!selectedOwnerId}
                                        >
                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                            Asignar
                                        </Button>
                                    </div>
                                </div>

                                {/* Assigned Owners List */}
                                <div className="flex-1 space-y-2 min-h-[120px]">
                                    {currentOwners.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-7 px-3 text-center border border-dashed rounded-md bg-muted/10">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Sin propietarios asignados
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                                                Puedes asignar uno o varios propietarios (total 100%).
                                            </p>
                                        </div>
                                    ) : (
                                        currentOwners.map((owner) => (
                                            <div
                                                key={owner.owner_id}
                                                className="flex items-center justify-between gap-2 p-2.5 border rounded-md bg-background"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                                                        {getInitials(owner.name)}
                                                    </div>
                                                    <p className="font-medium text-xs truncate">
                                                        {owner.name}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <div className="relative w-[74px]">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max="100"
                                                            className="h-7 text-xs pr-5 text-right tabular-nums"
                                                            value={owner.participation_percentage}
                                                            onChange={(e) => {
                                                                const val =
                                                                    parseFloat(e.target.value) || 0
                                                                setCurrentOwners((prev) =>
                                                                    prev.map((o) =>
                                                                        o.owner_id ===
                                                                        owner.owner_id
                                                                            ? {
                                                                                  ...o,
                                                                                  participation_percentage:
                                                                                      val,
                                                                              }
                                                                            : o
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                                                            %
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                        onClick={() =>
                                                            handleRemoveOwner(owner.owner_id)
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Participation Progress Meter */}
                                {currentOwners.length > 0 && (
                                    <div className="pt-2 border-t space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Total Participación
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                                                    isTotalValid
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-rose-600 dark:text-rose-400"
                                                }`}
                                            >
                                                {isTotalValid ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                ) : (
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                )}
                                                {totalPercentage.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${
                                                    isTotalValid
                                                        ? "bg-emerald-500"
                                                        : totalPercentage > 100
                                                          ? "bg-rose-500"
                                                          : "bg-amber-500"
                                                }`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, totalPercentage))}%`,
                                                }}
                                            />
                                        </div>
                                        {!isTotalValid && (
                                            <p className="text-[11px] text-rose-600 dark:text-rose-400">
                                                {totalPercentage < 100
                                                    ? `Falta asignar ${remainingPercentage.toFixed(2)}% para completar el 100%.`
                                                    : `Excede el 100% por ${(totalPercentage - 100).toFixed(2)}%.`}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                <DialogFooter className="px-6 py-3.5 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2 sm:justify-between">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        {!isView && "Los campos marcados con * son obligatorios."}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        {isView ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                            >
                                Cerrar
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading && (
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    )}
                                    {isCreate ? "Registrar Inmueble" : "Guardar Cambios"}
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
