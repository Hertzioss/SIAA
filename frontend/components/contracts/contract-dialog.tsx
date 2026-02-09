"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, User, Calendar, DollarSign, Building } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface ContractDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: "create" | "view" | "edit"
    contract?: any // Replace with proper type
}

/**
 * Diálogo para la gestión de contratos (Crear, Editar, Ver).
 * Permite asociar unidades e inquilinos, definir montos y vigencia.
 */
export function ContractDialog({
    open,
    onOpenChange,
    mode = "create",
    contract,
    properties = [],
    tenants = [],
    onSubmit
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: "create" | "view" | "edit"
    contract?: any
    properties?: any[]
    tenants?: any[]
    onSubmit?: (data: any) => Promise<void>
}) {
    const isView = mode === "view"
    const title =
        mode === "create"
            ? "Crear Nuevo Contrato"
            : mode === "edit"
                ? "Editar Contrato"
                : "Detalle del Contrato"
    const description =
        mode === "create"
            ? "Complete los detalles para generar un nuevo contrato de arrendamiento."
            : "Información detallada del contrato."

    const [formData, setFormData] = useState({
        unit_id: "",
        tenant_id: "",
        start_date: "",
        end_date: "",
        amount: "",
        type: "residential",
        isIndefinite: false,
        ...contract
    })

    // Update form data when contract changes
    useEffect(() => {
        if (contract) {
            setFormData({
                unit_id: contract.unit_id || "",
                tenant_id: contract.tenant_id || "",
                start_date: contract.start_date || "",
                end_date: contract.end_date || "",
                amount: contract.rent_amount || "",
                type: contract.type || "residential",
                isIndefinite: !contract.end_date
            })
        } else {
            setFormData({
                unit_id: "",
                tenant_id: tenants.length === 1 ? tenants[0].id : "",
                start_date: "",
                end_date: "",
                amount: "",
                type: "residential",
                isIndefinite: false
            })
        }
    }, [contract, open, tenants])

    // Flatten units for selection
    const units = properties.flatMap(p =>
        (p.units || []).map((u: any) => ({
            id: u.id,
            label: `${p.name} - ${u.name}`,
            default_rent: u.default_rent_amount,
            property_id: p.id,
            isOccupied: u.isOccupied
        }))
    )

    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleSubmit = async () => {
        if (!onSubmit) return;

        const missingFields = []
        if (!formData.unit_id) missingFields.push("Unidad")
        if (!formData.tenant_id) missingFields.push("Inquilino")
        if (!formData.start_date) missingFields.push("Fecha Inicio")
        // Duplicate check removed
        if (!formData.isIndefinite && !formData.end_date) missingFields.push("Fecha Fin")
        if (!formData.amount) missingFields.push("Monto")

        if (missingFields.length > 0) {
            toast.error(`Por favor complete los campos obligatorios: ${missingFields.join(", ")}`)
            return
        }

        const dataToSave = {
            unit_id: formData.unit_id,
            tenant_id: formData.tenant_id,
            start_date: formData.start_date,
            end_date: formData.isIndefinite ? null : formData.end_date,
            rent_amount: parseFloat(formData.amount),
            type: formData.type,
            status: contract?.statusRaw ?? contract?.status ?? 'active',
            file: selectedFile // Pass file to parent
        }

        await onSubmit(dataToSave)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {mode === "view" ? (
                    <Tabs defaultValue="info" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="info">Información General</TabsTrigger>
                            <TabsTrigger value="financial">Términos Financieros</TabsTrigger>
                        </TabsList>
                        <TabsContent value="info" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">ID Contrato</Label>
                                    <div className="font-medium text-xs break-all">{contract?.id || "N/A"}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Estado</Label>
                                    <div className="font-medium">{contract?.status || "Activo"}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Propiedad</Label>
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{contract?.property || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Inquilino</Label>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{contract?.tenant || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="financial" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Vigencia</Label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{contract?.end_date ? contract.duration : "Indefinido"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Monto Mensual</Label>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">${contract?.amount || "0.00"}</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="property">Propiedad (Unidad)</Label>
                                <Select
                                    value={formData.unit_id}
                                    onValueChange={(val) => {
                                        const unit = units.find(u => u.id === val);
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            unit_id: val,
                                            amount: unit?.default_rent ? String(unit.default_rent) : prev.amount
                                        }))
                                    }}
                                >
                                    <SelectTrigger id="property">
                                        <SelectValue placeholder="Seleccionar Unidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((unit) => (
                                            <SelectItem
                                                key={unit.id}
                                                value={unit.id}
                                                disabled={unit.isOccupied && mode === 'create'} // Only disable on create
                                                className={unit.isOccupied && mode === 'create' ? "text-muted-foreground" : ""}
                                            >
                                                {unit.label} {unit.isOccupied && mode === 'create' ? "(Ocupado)" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formData.unit_id && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Canon sugerido: ${units.find(u => u.id === formData.unit_id)?.default_rent || "N/A"}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tenant">Inquilino</Label>
                                <Select
                                    value={formData.tenant_id}
                                    onValueChange={(val) => setFormData((prev: any) => ({ ...prev, tenant_id: val }))}
                                    disabled={tenants.length === 1}
                                >
                                    <SelectTrigger id="tenant">
                                        <SelectValue placeholder="Seleccionar Inquilino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tenants.map((tenant: any) => (
                                            <SelectItem key={tenant.id} value={tenant.id}>
                                                {tenant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="start-date">Fecha Inicio</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, start_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="end-date">Fecha Fin</Label>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="indefinite"
                                        checked={formData.isIndefinite}
                                        onCheckedChange={(checked) => {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                isIndefinite: checked === true,
                                                end_date: checked === true ? "" : prev.end_date
                                            }))
                                        }}
                                    />
                                    <label
                                        htmlFor="indefinite"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Contrato Indefinido
                                    </label>
                                </div>
                            </div>
                            <Input
                                id="end-date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, end_date: e.target.value }))}
                                disabled={formData.isIndefinite}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="file">Contrato Escaneado (PDF/Imagen)</Label>
                            <Input
                                id="file"
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            {contract?.file_url && (
                                <a href={contract.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                    Ver Contrato Actual
                                </a>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto Mensual ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Contrato</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData((prev: any) => ({ ...prev, type: val as any }))}
                            >
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="residential">Residencial</SelectItem>
                                    <SelectItem value="commercial">Comercial</SelectItem>
                                    <SelectItem value="industrial">Industrial</SelectItem>
                                    <SelectItem value="office">Oficina</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {mode === "view" ? (
                        <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit}>
                                {mode === "create" ? "Generar Contrato" : "Guardar Cambios"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
