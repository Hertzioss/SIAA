'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit, Building, CreditCard, DollarSign, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

// Mock Data for Bank Accounts
const BANK_ACCOUNTS_DATA = [
    {
        id: "1",
        bank: "Banco Mercantil",
        accountNumber: "0105-****-****-1234",
        holder: "Inmobiliaria SIAA C.A.",
        currency: "Bs",
        type: "Corriente"
    },
    {
        id: "2",
        bank: "Banesco",
        accountNumber: "0134-****-****-5678",
        holder: "Inmobiliaria SIAA C.A.",
        currency: "USD",
        type: "Custodia"
    },
    {
        id: "3",
        bank: "Zelle",
        accountNumber: "pagos@siaa.com",
        holder: "Inmobiliaria SIAA",
        currency: "USD",
        type: "Digital"
    }
]

export default function AccountPage() {
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)

    const handleSaveProfile = () => {
        toast.success("Perfil de empresa actualizado")
    }

    const handleSaveAccounting = () => {
        toast.success("Configuración contable actualizada")
    }

    const handleAddAccount = () => {
        setIsAccountDialogOpen(false)
        toast.success("Cuenta bancaria agregada")
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración de Empresa</h1>
                    <p className="text-muted-foreground">
                        Administre la información de la empresa, cuentas bancarias y contabilidad.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="profile">
                        <Building className="mr-2 h-4 w-4" /> Perfil
                    </TabsTrigger>
                    <TabsTrigger value="banks">
                        <CreditCard className="mr-2 h-4 w-4" /> Cuentas Bancarias
                    </TabsTrigger>
                    <TabsTrigger value="accounting">
                        <DollarSign className="mr-2 h-4 w-4" /> Contabilidad
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
                                    <Input defaultValue="Inmobiliaria SIAA C.A." />
                                </div>
                                <div className="space-y-2">
                                    <Label>RIF / NIT / ID Fiscal</Label>
                                    <Input defaultValue="J-12345678-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Dirección Fiscal</Label>
                                <Input defaultValue="Av. Principal, Torre Empresarial, Piso 5, Ofic. 5-A" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Teléfono de Contacto</Label>
                                    <Input defaultValue="+58 212 555-5555" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Correo Electrónico</Label>
                                    <Input defaultValue="administracion@siaa.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Logo de la Empresa</Label>
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center border border-dashed">
                                        <Building className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <Button variant="outline" size="sm">Subir Logo</Button>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveProfile}>
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
            </Tabs>
        </div>
    )
}
