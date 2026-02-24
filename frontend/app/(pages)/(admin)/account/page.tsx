'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit, Building, CreditCard, DollarSign, Save, Lock, Mail, SendHorizonal } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { SecurityForm } from "@/components/security-form"
import { getCompany, updateCompany } from "@/actions/company"
import { supabase } from "@/lib/supabase"
import { v4 as uuidv4 } from 'uuid'

// Mock Data for Bank Accounts
const BANK_ACCOUNTS_DATA = [
    {
        id: "1",
        bank: "Banco Mercantil",
        accountNumber: "0105-****-****-1234",
        holder: "Escritorio Legal C.A.",
        currency: "Bs",
        type: "Corriente"
    },
    {
        id: "2",
        bank: "Banesco",
        accountNumber: "0134-****-****-5678",
        holder: "Escritorio Legal C.A.",
        currency: "USD",
        type: "Custodia"
    },
    {
        id: "3",
        bank: "Zelle",
        accountNumber: "pagos@escritorio.legal",
        holder: "Escritorio Legal",
        currency: "USD",
        type: "Digital"
    }
]

/**
 * Página de configuración de la cuenta de empresa.
 * Permite gestionar la información general de la empresa, cuentas bancarias
 * y parámetros de configuración contable.
 */
export default function AccountPage() {
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [emailEnabled, setEmailEnabled] = useState(true)
    const [savingEmail, setSavingEmail] = useState(false)
    const [testEmail, setTestEmail] = useState('')
    const [sendingTest, setSendingTest] = useState(false)
    const [profileData, setProfileData] = useState({
        name: "",
        rif: "",
        address: "",
        phone: "",
        email: "",
        logo_url: "" as string | null | undefined
    })

    useEffect(() => {
        loadCompany()
    }, [])

    const loadCompany = async () => {
        setLoading(true)
        const res = await getCompany()
        if (res.success && res.data) {
            setProfileData({
                name: res.data.name || "",
                rif: res.data.rif || "",
                address: res.data.address || "",
                phone: res.data.phone || "",
                email: res.data.email || "",
                logo_url: res.data.logo_url
            })
            setEmailEnabled(res.data.email_enabled !== false)
        }
        setLoading(false)
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${uuidv4()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('company-logos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('company-logos')
                .getPublicUrl(filePath)

            setProfileData(prev => ({ ...prev, logo_url: publicUrl }))
            toast.success("Logo subido correctamente")
        } catch (error: unknown) {
            console.error("Error uploading logo:", error)
            toast.error("Error al subir el logo")
        } finally {
            setUploading(false)
        }
    }

    const handleSaveProfile = async () => {
        setLoading(true)
        try {
            const res = await updateCompany({
                name: profileData.name,
                rif: profileData.rif,
                address: profileData.address,
                phone: profileData.phone,
                email: profileData.email,
                logo_url: profileData.logo_url
            })

            if (res.success) {
                toast.success("Se guardó correctamente")
            } else {
                toast.error("Error al actualizar perfil: " + res.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    const handleSaveAccounting = () => {
        toast.success("Se guardó correctamente")
    }

    const handleSaveEmailSettings = async () => {
        setSavingEmail(true)
        try {
            const res = await updateCompany({ email_enabled: emailEnabled })
            if (res.success) {
                toast.success("Configuración de email guardada")
            } else {
                toast.error("Error al guardar: " + res.error)
            }
        } catch {
            toast.error("Error inesperado")
        } finally {
            setSavingEmail(false)
        }
    }

    const handleSendTest = async () => {
        if (!testEmail) return
        setSendingTest(true)
        try {
            const res = await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: [{ email: testEmail, name: 'Prueba' }],
                    subject: 'Email de prueba — Sistema',
                    message: 'Este es un email de prueba enviado desde la configuración del sistema. Si lo recibiste, el servicio de email está funcionando correctamente.'
                })
            })
            const data = await res.json()
            if (data.skipped) {
                toast.warning('El envío está desactivado. Activa el toggle y guarda antes de probar.')
            } else if (data.success) {
                toast.success(`Email de prueba enviado a ${testEmail}`)
                setTestEmail('')
            } else {
                toast.error('Error al enviar: ' + (data.error || 'desconocido'))
            }
        } catch {
            toast.error('Error inesperado al enviar el email de prueba')
        } finally {
            setSendingTest(false)
        }
    }

    const handleAddAccount = () => {
        setIsAccountDialogOpen(false)
        toast.success("Cuenta bancaria agregada")
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">
                        Administre la información de la empresa, cuentas bancarias y contabilidad.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-5 max-w-[1000px]">
                    <TabsTrigger value="profile">
                        <Building className="mr-2 h-4 w-4" /> Perfil
                    </TabsTrigger>
                    <TabsTrigger value="banks">
                        <CreditCard className="mr-2 h-4 w-4" /> Cuentas Bancarias
                    </TabsTrigger>
                    <TabsTrigger value="accounting">
                        <DollarSign className="mr-2 h-4 w-4" /> Contabilidad
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Mail className="mr-2 h-4 w-4" /> Notificaciones
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <Lock className="mr-2 h-4 w-4" /> Seguridad
                    </TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información General</CardTitle>
                            <CardDescription>Datos legales y de contacto de la empresa administradora.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre / Razón Social</Label>
                                    <Input 
                                        value={profileData.name} 
                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>RIF / NIT / ID Fiscal</Label>
                                    <Input 
                                        value={profileData.rif} 
                                        onChange={(e) => setProfileData({...profileData, rif: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Dirección Fiscal</Label>
                                <Input 
                                    value={profileData.address} 
                                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Teléfono de Contacto</Label>
                                    <Input 
                                        value={profileData.phone} 
                                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Correo Electrónico</Label>
                                    <Input 
                                        value={profileData.email} 
                                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Logo de la Empresa</Label>
                                <div className="flex items-center gap-4">
                                    <div className="h-56 w-56 bg-muted rounded-lg flex items-center justify-center border border-dashed overflow-hidden relative">
                                        {profileData.logo_url ? (
                                            <img src={profileData.logo_url} alt="Company Logo" className="h-full w-full object-contain p-2" />
                                        ) : (
                                            <Building className="h-16 w-16 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()} disabled={uploading}>
                                            {uploading ? "Subiendo..." : "Subir Logo"}
                                        </Button>
                                        <input 
                                            id="logo-upload" 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleLogoUpload}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveProfile} disabled={loading}>
                                    <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BANK ACCOUNTS TAB */}
                <TabsContent value="banks" className="mt-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Cuentas Registradas</h3>
                        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Agregar Cuenta
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Agregar Cuenta Bancaria</DialogTitle>
                                    <DialogDescription>
                                        Registre una nueva cuenta para recibir pagos.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Banco / Plataforma</Label>
                                        <Input placeholder="Ej. Banesco, Zelle" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Titular de la Cuenta</Label>
                                        <Input placeholder="Nombre del titular" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Número / Correo</Label>
                                            <Input placeholder="0134..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Moneda</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="bs">Bolívares (Bs)</SelectItem>
                                                    <SelectItem value="usd">Dólares (USD)</SelectItem>
                                                    <SelectItem value="eur">Euros (EUR)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo de Cuenta</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="current">Corriente</SelectItem>
                                                <SelectItem value="savings">Ahorro</SelectItem>
                                                <SelectItem value="custody">Custodia / Divisas</SelectItem>
                                                <SelectItem value="digital">Billetera Digital</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleAddAccount}>Guardar Cuenta</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Banco</TableHead>
                                        <TableHead>Datos</TableHead>
                                        <TableHead>Titular</TableHead>
                                        <TableHead>Moneda</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {BANK_ACCOUNTS_DATA.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.bank}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{account.accountNumber}</span>
                                                    <span className="text-xs text-muted-foreground">{account.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{account.holder}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{account.currency}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ACCOUNTING TAB */}
                <TabsContent value="accounting" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Contable</CardTitle>
                            <CardDescription>Defina los parámetros base para la facturación y reportes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Moneda Principal</Label>
                                    <Select defaultValue="usd">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bs">Bolívares (Bs)</SelectItem>
                                            <SelectItem value="usd">Dólares (USD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Moneda base para reportes financieros.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Impuesto (%)</Label>
                                    <Input type="number" defaultValue="16" />
                                    <p className="text-xs text-muted-foreground">Porcentaje de IVA o impuesto aplicable.</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label>Cierre Fiscal</Label>
                                <Select defaultValue="dec">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dec">31 de Diciembre</SelectItem>
                                        <SelectItem value="mar">31 de Marzo</SelectItem>
                                        <SelectItem value="sep">30 de Septiembre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveAccounting}>
                                    <Save className="mr-2 h-4 w-4" /> Guardar Configuración
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* NOTIFICATIONS TAB */}
                <TabsContent value="notifications" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notificaciones por Email</CardTitle>
                            <CardDescription>
                                Control global del envío de correos electrónicos del sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <p className="text-base font-medium">Envío de Emails</p>
                                    <p className="text-sm text-muted-foreground">
                                        {emailEnabled
                                            ? "Los correos se envían normalmente a inquilinos y propietarios."
                                            : "El envío de correos está desactivado. Ningún email saldrá del sistema."}
                                    </p>
                                </div>
                                <Switch
                                    checked={emailEnabled}
                                    onCheckedChange={setEmailEnabled}
                                />
                            </div>

                            {!emailEnabled && (
                                <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
                                    <Mail className="h-5 w-5 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-medium">Envío de emails desactivado</p>
                                        <p className="mt-1 text-amber-700 dark:text-amber-500">
                                            Los recibos de pago, recordatorios y comunicaciones no se enviarán hasta que vuelva a activar esta opción.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button onClick={handleSaveEmailSettings} disabled={savingEmail}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {savingEmail ? "Guardando..." : "Guardar Configuración"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Prueba de Envío</CardTitle>
                            <CardDescription>
                                Envía un email de prueba para verificar que el servicio está configurado correctamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
                                    />
                                    <Button
                                        onClick={handleSendTest}
                                        disabled={sendingTest || !testEmail}
                                        variant="outline"
                                    >
                                        <SendHorizonal className="mr-2 h-4 w-4" />
                                        {sendingTest ? 'Enviando...' : 'Enviar Prueba'}
                                    </Button>
                                </div>
                                {profileData.email && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        Enviado desde: <span className="font-medium">{profileData.email}</span>
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seguridad</CardTitle>
                            <CardDescription>Gestione su contraseña y opciones de acceso.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SecurityForm />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
