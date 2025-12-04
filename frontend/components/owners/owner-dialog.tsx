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
import { User, Building, Plus, Trash, Mail, Phone, MapPin, Briefcase } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Beneficiary {
    name: string
    docId: string
    participation: string
}

interface OwnerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: "create" | "view" | "edit"
    owner?: any // Replace with proper type
}

export function OwnerDialog({
    open,
    onOpenChange,
    mode = "create",
    owner,
}: OwnerDialogProps) {
    const [ownerType, setOwnerType] = useState<"individual" | "company">("individual")
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
    const [newBeneficiary, setNewBeneficiary] = useState<Beneficiary>({ name: "", docId: "", participation: "" })

    useEffect(() => {
        if (owner) {
            setOwnerType(owner.type === "company" ? "company" : "individual")
            if (owner.beneficiaries) {
                setBeneficiaries(owner.beneficiaries)
            }
        } else {
            setOwnerType("individual")
            setBeneficiaries([])
        }
    }, [owner, open])

    const addBeneficiary = () => {
        if (newBeneficiary.name && newBeneficiary.docId) {
            setBeneficiaries([...beneficiaries, newBeneficiary])
            setNewBeneficiary({ name: "", docId: "", participation: "" })
        }
    }

    const removeBeneficiary = (index: number) => {
        const newList = [...beneficiaries]
        newList.splice(index, 1)
        setBeneficiaries(newList)
    }

    const isView = mode === "view"
    const title =
        mode === "create"
            ? "Registrar Nuevo Propietario"
            : mode === "edit"
                ? "Editar Propietario"
                : "Detalle del Propietario"
    const description =
        mode === "create"
            ? "Ingrese los datos del propietario o empresa."
            : "Información detallada del propietario."

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {ownerType === 'company' ? <Building className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                    {mode === 'create' && (
                        <div className="mb-6">
                            <Label className="text-base font-medium mb-3 block">Tipo de Propietario</Label>
                            <RadioGroup
                                defaultValue="individual"
                                value={ownerType}
                                onValueChange={(v) => setOwnerType(v as "individual" | "company")}
                                className="grid grid-cols-2 gap-4"
                            >
                                <div>
                                    <RadioGroupItem value="individual" id="individual" className="peer sr-only" />
                                    <Label
                                        htmlFor="individual"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                        <User className="mb-3 h-6 w-6" />
                                        Individual
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="company" id="company" className="peer sr-only" />
                                    <Label
                                        htmlFor="company"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                        <Building className="mb-3 h-6 w-6" />
                                        Empresa
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {isView ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                                    {ownerType === 'company' ? <Building className="h-10 w-10 text-primary" /> : <User className="h-10 w-10 text-primary" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{owner?.name}</h3>
                                    <p className="text-sm text-muted-foreground">{owner?.docId}</p>
                                    {ownerType === 'company' && <Badge variant="outline" className="mt-2">Empresa</Badge>}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Información de Contacto</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{owner?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{owner?.phone}</span>
                                    </div>
                                    <div className="flex items-start gap-3 col-span-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <span className="text-sm">{owner?.address}</span>
                                    </div>
                                </div>
                            </div>

                            {ownerType === 'company' && beneficiaries.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Beneficiarios / Socios</h4>
                                        <div className="space-y-2">
                                            {beneficiaries.map((b, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                                    <div className="flex items-center gap-3">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">{b.name}</p>
                                                            <p className="text-xs text-muted-foreground">{b.docId}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary">{b.participation}%</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{ownerType === 'company' ? 'Razón Social / Nombre de la Sucesión' : 'Nombre Completo'}</Label>
                                <Input id="name" placeholder={ownerType === 'company' ? "Ej. Inversiones Los Andes C.A." : "Ej. Juan Pérez"} defaultValue={owner?.name} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="id-doc">{ownerType === 'company' ? 'RIF' : 'Cédula de Identidad'}</Label>
                                    <Input id="id-doc" placeholder={ownerType === 'company' ? "J-12345678-9" : "V-12345678"} defaultValue={owner?.docId} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input id="phone" placeholder="+58 412 1234567" defaultValue={owner?.phone} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input id="email" type="email" placeholder="contacto@email.com" defaultValue={owner?.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Dirección {ownerType === 'company' ? 'Fiscal' : 'de Habitación'}</Label>
                                <Input id="address" placeholder="Dirección completa" defaultValue={owner?.address} />
                            </div>

                            {ownerType === 'company' && (
                                <div className="pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Beneficiarios / Socios</Label>
                                    </div>
                                    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-5">
                                                <Input placeholder="Nombre" value={newBeneficiary.name} onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })} className="h-8 text-sm" />
                                            </div>
                                            <div className="col-span-4">
                                                <Input placeholder="Cédula" value={newBeneficiary.docId} onChange={(e) => setNewBeneficiary({ ...newBeneficiary, docId: e.target.value })} className="h-8 text-sm" />
                                            </div>
                                            <div className="col-span-2">
                                                <Input placeholder="%" type="number" value={newBeneficiary.participation} onChange={(e) => setNewBeneficiary({ ...newBeneficiary, participation: e.target.value })} className="h-8 text-sm" />
                                            </div>
                                            <div className="col-span-1">
                                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={addBeneficiary}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {beneficiaries.length > 0 && (
                                            <div className="space-y-2 mt-2">
                                                {beneficiaries.map((b, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-background p-2 rounded border text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3 w-3 text-muted-foreground" />
                                                            <span>{b.name}</span>
                                                            <span className="text-muted-foreground text-xs">({b.docId})</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="h-5 text-[10px]">{b.participation}%</Badge>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeBeneficiary(i)}>
                                                                <Trash className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    {mode === "view" ? (
                        <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => onOpenChange(false)}>
                                {mode === "create" ? "Registrar Propietario" : "Guardar Cambios"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
