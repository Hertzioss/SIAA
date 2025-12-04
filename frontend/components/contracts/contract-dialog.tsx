"use client"

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
}: ContractDialogProps) {
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
                                    <div className="font-medium">{contract?.id || "N/A"}</div>
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
                                        <span className="font-medium">{contract?.amount || "$0.00"}</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="property">Propiedad</Label>
                                <Select defaultValue={contract?.propertyValue}>
                                    <SelectTrigger id="property">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rev-101">REV-101 (Res. El Valle)</SelectItem>
                                        <SelectItem value="te-500">TE-500 (Torre Emp.)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tenant">Inquilino</Label>
                                <Input
                                    id="tenant"
                                    placeholder="Nombre del inquilino"
                                    defaultValue={contract?.tenant}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Fecha Inicio</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    defaultValue={contract?.startDate}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duración (Meses)</Label>
                                <Select defaultValue={contract?.duration ? contract.duration.replace(" Meses", "") : "12"}>
                                    <SelectTrigger id="duration">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => i + 1).map((month) => (
                                            <SelectItem key={month} value={month.toString()}>
                                                {month} {month === 1 ? "Mes" : "Meses"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto Mensual ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                defaultValue={contract?.amountValue}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Contrato</Label>
                            <Select defaultValue={contract?.type}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Residencial">Residencial</SelectItem>
                                    <SelectItem value="Comercial">Comercial</SelectItem>
                                    <SelectItem value="Industrial">Industrial</SelectItem>
                                    <SelectItem value="Oficina">Oficina</SelectItem>
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
                            <Button onClick={() => onOpenChange(false)}>
                                {mode === "create" ? "Generar Contrato" : "Guardar Cambios"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
