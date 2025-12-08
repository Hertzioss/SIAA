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

interface ContractDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: "create" | "view" | "edit"
    contract?: any // Replace with proper type
}

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
            })
        } else {
            setFormData({
                unit_id: "",
                tenant_id: "",
                start_date: "",
                end_date: "",
                amount: "",
                type: "residential",
            })
        }
    }, [contract, open])

    // Flatten units for selection
    const units = properties.flatMap(p =>
        (p.units || []).map((u: any) => ({
            id: u.id,
            label: `${p.name} - ${u.name}`,
            default_rent: u.default_rent_amount,
            property_id: p.id
        }))
    )

    const handleSubmit = async () => {
        if (!onSubmit) return;

        const dataToSave = {
            unit_id: formData.unit_id,
            tenant_id: formData.tenant_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            rent_amount: parseFloat(formData.amount),
            type: formData.type,
            status: contract?.statusRaw ?? contract?.status ?? 'active'
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
                                        <span className="font-medium">{contract?.duration || "N/A"}</span>
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
                                        setFormData(prev => ({
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
                                            <SelectItem key={unit.id} value={unit.id}>
                                                {unit.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tenant">Inquilino</Label>
                                <Select
                                    value={formData.tenant_id}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, tenant_id: val }))}
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
                                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date">Fecha Fin</Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto Mensual ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Contrato</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, type: val as any }))}
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
