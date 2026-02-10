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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { User, Building, Plus, Trash, Mail, Phone, MapPin, Lock, Unlock } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Owner, OwnerBeneficiary } from "@/types/owner"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OwnerAccountsList } from "./owner-accounts-list"
import { enableOwnerAccess, disableOwnerAccess, resetOwnerPassword } from "@/actions/access"
import { supabase } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"
import Image from "next/image"

interface OwnerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: "create" | "view" | "edit"
    owner?: Owner
    onSubmit?: (data: any) => Promise<void>
    onOwnerUpdated?: () => void
}

/**
 * Diálogo para gestionar la información de propietarios.
 * Soporta registro de personas naturales y empresas (con beneficiarios), y gestión de cuentas bancarias.
 */
export function OwnerDialog({
    open,
    onOpenChange,
    mode = "create",
    owner,
    onSubmit,
    onOwnerUpdated
}: OwnerDialogProps) {
    const [loading, setLoading] = useState(false)
    const [accessLoading, setAccessLoading] = useState(false)
    const [ownerType, setOwnerType] = useState<"individual" | "company">("individual")
    const [manualPassword, setManualPassword] = useState("")

    // Split Doc ID State
    const [docPrefix, setDocPrefix] = useState("V")
    const [docNumber, setDocNumber] = useState("")

    // Form States
    const [formData, setFormData] = useState({
        name: "",
        doc_id: "",
        email: "",
        phone: "",
        address: "",
        logo_url: ""
    })

    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    const [beneficiaries, setBeneficiaries] = useState<OwnerBeneficiary[]>([])
    const [newBeneficiary, setNewBeneficiary] = useState({ name: "", doc_id: "", participation: "" })

    useEffect(() => {
        if (open) {
            if (owner && mode !== 'create') {
                setOwnerType(owner.type)
                setFormData({
                    name: owner.name,
                    doc_id: owner.doc_id,
                    email: owner.email || "",
                    phone: owner.phone || "",
                    address: owner.address || "",
                    logo_url: owner.logo_url || ""
                })

                // Reset file state to avoid carrying over from previous operations
                setLogoFile(null)

                if (owner.logo_url) {
                    setLogoPreview(owner.logo_url)
                } else {
                    setLogoPreview(null)
                }

                // Parse existing doc_id
                const parts = owner.doc_id.split('-')
                if (parts.length === 2 && ["V", "E", "J", "G"].includes(parts[0])) {
                    setDocPrefix(parts[0])
                    setDocNumber(parts[1])
                } else {
                    setDocPrefix("V")
                    setDocNumber(owner.doc_id)
                }

                setBeneficiaries(owner.beneficiaries || [])
            } else {
                // Reset for create
                setOwnerType("individual")
                setFormData({ name: "", doc_id: "", email: "", phone: "", address: "", logo_url: "" })
                setLogoPreview(null)
                setLogoFile(null)
                setDocPrefix("V")
                setDocNumber("")
                setBeneficiaries([])
            }
            setManualPassword("") // Reset password field
        }
    }, [owner, mode, open])

    const addBeneficiary = () => {
        if (newBeneficiary.name && newBeneficiary.doc_id && newBeneficiary.participation) {
            setBeneficiaries([...beneficiaries, {
                id: crypto.randomUUID(), // Temp ID
                owner_id: owner?.id || "",
                name: newBeneficiary.name,
                doc_id: newBeneficiary.doc_id,
                participation_percentage: Number(newBeneficiary.participation)
            }])
            setNewBeneficiary({ name: "", doc_id: "", participation: "" })
        }
    }

    const removeBeneficiary = (index: number) => {
        const newList = [...beneficiaries]
        newList.splice(index, 1)
        setBeneficiaries(newList)
    }

    const handleSubmit = async () => {
        if (!onSubmit) return

        // Basic validation
        if (!formData.name || !docNumber) {
            toast.error("Por favor complete los campos obligatorios")
            return
        }

        const fullDocId = `${docPrefix}-${docNumber}`

        setLoading(true)
        try {
            await onSubmit({
                type: ownerType,
                ...formData,
                doc_id: fullDocId,
                beneficiaries
            })
            onOpenChange(false)
        } catch (error) {
            // Error is handled in the parent hook
        } finally {
            setLoading(false)
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            const objectUrl = URL.createObjectURL(file)
            setLogoPreview(objectUrl)
        }
    }

    const uploadLogo = async () => {
        if (!logoFile) return null

        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`
        // Use simpler path, just filename, since we are separating by bucket
        const filePath = fileName 
        
        // All owner logos go to owner-logos bucket
        const bucketName = 'owner-logos'

        try {
            const { error: uploadError } = await supabase.storage
                .from(bucketName) 
                .upload(filePath, logoFile)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath)

            return publicUrl
        } catch (error) {
            console.error('Error uploading logo:', error)
            toast.error('Error al subir el logo')
            return null
        }
    }

    // Wrap submission to handle upload first
    const handleFormSubmit = async () => {
         if (!onSubmit) return

        // Basic validation
        if (!formData.name || !docNumber) {
            toast.error("Por favor complete los campos obligatorios")
            return
        }

        setLoading(true)

        try {
            let finalLogoUrl = formData.logo_url

            if (logoFile) {
                const uploadedUrl = await uploadLogo()
                if (uploadedUrl) {
                    finalLogoUrl = uploadedUrl
                }
            }

            const fullDocId = `${docPrefix}-${docNumber}`

            await onSubmit({
                type: ownerType,
                ...formData,
                logo_url: finalLogoUrl,
                doc_id: fullDocId,
                beneficiaries
            })
            onOpenChange(false)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Handler for Enabling Access
    const handleEnableAccess = async () => {
        if (!owner?.id || !owner?.email) {
            toast.error("El propietario debe tener un email registrado")
            return
        }

        setAccessLoading(true)
        try {
            const res = await enableOwnerAccess(owner.id, owner.email, manualPassword || undefined)
            if (res.success && res.data) {
                toast.success("Acceso habilitado correctamente", {
                    description: `Contraseña: ${res.data.password}`,
                    duration: 10000,
                    action: {
                        label: "Copiar",
                        onClick: () => navigator.clipboard.writeText(res.data.password)
                    }
                })
                setManualPassword("")
                if (onOwnerUpdated) onOwnerUpdated()
                onOpenChange(false)
            } else {
                toast.error(res.error || "Error habilitando acceso")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setAccessLoading(false)
        }
    }

    // Handler for Disabling Access
    const handleDisableAccess = async () => {
        if (!owner?.id) return
        setAccessLoading(true)
        try {
            const res = await disableOwnerAccess(owner.id)
            if (res.success) {
                toast.success("Acceso deshabilitado")
                setManualPassword("")
                if (onOwnerUpdated) onOwnerUpdated()
                onOpenChange(false)
            } else {
                toast.error(res.error)
            }
        } finally {
            setAccessLoading(false)
        }
    }

    const handleResetPassword = async () => {
        if (!owner?.id) return
        setAccessLoading(true)
        try {
            const res = await resetOwnerPassword(owner.id, manualPassword || undefined)
            if (res.success && res.data) {
                toast.success("Contraseña actualizada", {
                    description: `Nueva contraseña: ${res.data.password}`,
                    duration: 20000,
                    action: {
                        label: "Copiar",
                        onClick: () => navigator.clipboard.writeText(res.data.password)
                    }
                })
                setManualPassword("")
            } else {
                toast.error(res.error || "Error restableciendo contraseña")
            }
        } catch (err) {
            toast.error("Error inesperado")
        } finally {
            setAccessLoading(false)
        }
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
                    {mode === 'create' ? (
                        <div className="space-y-6">
                            <div className="mb-6">
                                <Label className="text-base font-medium mb-3 block">Tipo de Propietario</Label>
                                <RadioGroup
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

                            {/* Create Form Fields */}
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Logo (Opcional)</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-24 w-24 rounded-full bg-muted border flex items-center justify-center overflow-hidden relative">
                                            {logoPreview ? (
                                                <Image 
                                                    src={logoPreview} 
                                                    alt="Logo" 
                                                    fill 
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <Building className="h-10 w-10 text-muted-foreground" />
                                            )}
                                        </div>
                                        <Input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleLogoChange}
                                            className="w-full max-w-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">{ownerType === 'company' ? 'Razón Social / Nombre ' : 'Nombre Completo'}</Label>
                                    <Input
                                        id="name"
                                        placeholder={ownerType === 'company' ? "Ej. Inversiones Los Andes C.A." : "Ej. Juan Pérez"}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="id-doc">{ownerType === 'company' ? 'RIF' : 'Cédula de Identidad'}</Label>
                                        <div className="flex gap-2">
                                            <Select value={docPrefix} onValueChange={setDocPrefix}>
                                                <SelectTrigger className="w-[70px]">
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="V">V</SelectItem>
                                                    <SelectItem value="E">E</SelectItem>
                                                    <SelectItem value="J">J</SelectItem>
                                                    <SelectItem value="G">G</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                id="id-doc"
                                                placeholder={ownerType === 'company' ? "12345678-9" : "12345678"}
                                                value={docNumber}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '')
                                                    setDocNumber(val)
                                                }}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+58 412 1234567"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="contacto@email.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Dirección {ownerType === 'company' ? 'Fiscal' : 'de Habitación'}</Label>
                                    <Input
                                        id="address"
                                        placeholder="Dirección completa"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>

                                {ownerType === 'company' && (
                                    <div className="pt-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base">Beneficiarios / Socios</Label>
                                        </div>
                                        <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                            <div className="grid grid-cols-12 gap-2">
                                                <div className="col-span-12 sm:col-span-5">
                                                    <Input
                                                        placeholder="Nombre"
                                                        value={newBeneficiary.name}
                                                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-8 sm:col-span-4">
                                                    <Input
                                                        placeholder="Cédula"
                                                        value={newBeneficiary.doc_id}
                                                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, doc_id: e.target.value })}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-3 sm:col-span-2">
                                                    <Input
                                                        placeholder="%"
                                                        type="number"
                                                        value={newBeneficiary.participation}
                                                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, participation: e.target.value })}
                                                        className="h-8 text-sm"
                                                    />
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
                                                                <span className="text-muted-foreground text-xs">({b.doc_id})</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="h-5 text-[10px]">{b.participation_percentage}%</Badge>
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
                        </div>
                    ) : (
                        <Tabs defaultValue="info">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="info">Información</TabsTrigger>
                                <TabsTrigger value="bank_accounts">Cuentas Bancarias</TabsTrigger>
                            </TabsList>
                            <TabsContent value="info" className="space-y-6">
                                {isView ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col items-center text-center space-y-2">
                                            <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden relative border">
                                                {owner?.logo_url ? (
                                                     <Image 
                                                        src={owner.logo_url} 
                                                        alt="Logo" 
                                                        fill 
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    ownerType === 'company' ? <Building className="h-12 w-12 text-primary" /> : <User className="h-12 w-12 text-primary" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{owner?.name}</h3>
                                                <p className="text-sm text-muted-foreground">{owner?.doc_id}</p>
                                                {ownerType === 'company' && <Badge variant="outline" className="mt-2">Empresa</Badge>}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid gap-4">
                                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Información de Contacto</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">{owner?.email || "N/A"}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">{owner?.phone || "N/A"}</span>
                                                </div>
                                                <div className="flex items-start gap-3 col-span-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <span className="text-sm">{owner?.address || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Acceso al Sistema</h4>
                                                {owner?.user_id ? (
                                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                        <Unlock className="w-3 h-3 mr-1" /> Habilitado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        <Lock className="w-3 h-3 mr-1" /> Inhabilitado
                                                    </Badge>
                                                )}
                                            </div>


                                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/10">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">Portal de Propietarios</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {owner?.user_id
                                                                ? "El propietario tiene acceso habilitado."
                                                                : "Habilite el acceso para que pueda ver sus propiedades."}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="manual-pass" className="text-xs">
                                                        Contraseña Manual (Opcional)
                                                    </Label>
                                                    <Input
                                                        id="manual-pass"
                                                        type="text"
                                                        placeholder="Dejar vacío para autogenerar"
                                                        value={manualPassword}
                                                        onChange={(e) => setManualPassword(e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>

                                                <div className="flex justify-end gap-2">
                                                    {owner?.user_id ? (
                                                        <>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={handleDisableAccess}
                                                                disabled={accessLoading}
                                                            >
                                                                {accessLoading ? "..." : "Deshabilitar"}
                                                            </Button>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={handleResetPassword}
                                                                disabled={accessLoading}
                                                            >
                                                                <Lock className="w-3 h-3 mr-2" />
                                                                Actualizar Contraseña
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={handleEnableAccess}
                                                            disabled={!owner?.email || accessLoading}
                                                        >
                                                            {accessLoading ? "..." : "Habilitar Acceso"}
                                                        </Button>
                                                    )}
                                                </div>

                                                {owner?.user_id && (
                                                    <div className="pt-2 border-t mt-2">
                                                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                                            <div>
                                                                <span className="text-muted-foreground block text-xs">Usuario</span>
                                                                <span className="font-mono bg-background px-2 py-1 rounded border inline-block mt-1 truncate max-w-full">
                                                                    {owner.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {!owner?.email && !owner?.user_id && (
                                                <p className="text-xs text-destructive">
                                                    * Se requiere un correo electrónico para habilitar el acceso.
                                                </p>
                                            )}
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
                                                                        <p className="text-xs text-muted-foreground">{b.doc_id}</p>
                                                                    </div>
                                                                </div>
                                                                <Badge variant="secondary">{b.participation_percentage}%</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* Edit Form - Reusing logic */
                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Logo (Opcional)</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="h-24 w-24 rounded-full bg-muted border flex items-center justify-center overflow-hidden relative">
                                                    {logoPreview ? (
                                                        <Image
                                                            src={logoPreview}
                                                            alt="Logo"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <Building className="h-10 w-10 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoChange}
                                                    className="w-full max-w-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">{ownerType === 'company' ? 'Razón Social / Nombre' : 'Nombre Completo'}</Label>
                                            <Input
                                                id="name"
                                                placeholder={ownerType === 'company' ? "Ej. Inversiones Los Andes C.A." : "Ej. Juan Pérez"}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="id-doc">{ownerType === 'company' ? 'RIF' : 'Cédula de Identidad'}</Label>
                                                <div className="flex gap-2">
                                                    <Select value={docPrefix} onValueChange={setDocPrefix}>
                                                        <SelectTrigger className="w-[70px]">
                                                            <SelectValue placeholder="Tipo" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="V">V</SelectItem>
                                                            <SelectItem value="E">E</SelectItem>
                                                            <SelectItem value="J">J</SelectItem>
                                                            <SelectItem value="G">G</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        id="id-doc"
                                                        placeholder={ownerType === 'company' ? "12345678-9" : "12345678"}
                                                        value={docNumber}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                                            setDocNumber(val)
                                                        }}
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="phone">Teléfono</Label>
                                                <Input
                                                    id="phone"
                                                    placeholder="+58 412 1234567"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Correo Electrónico</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="contacto@email.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="address">Dirección {ownerType === 'company' ? 'Fiscal' : 'de Habitación'}</Label>
                                            <Input
                                                id="address"
                                                placeholder="Dirección completa"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                            <TabsContent value="bank_accounts">
                                {owner?.id && <OwnerAccountsList ownerId={owner.id} readOnly={false} />}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    {mode === "view" ? (
                        <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button onClick={handleFormSubmit} disabled={loading}>
                                {loading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                                {mode === "create" ? "Registrar Propietario" : "Guardar Cambios"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
