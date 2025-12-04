'use client'

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { User, Phone, Mail, FileText, MessageSquare, PhoneOutgoing, Download, Plus, Clock, DollarSign, Send, Printer as PrinterIcon, ArrowLeft, Building } from "lucide-react"
import { toast } from "sonner"
import { TENANTS_DATA } from "../mock-data"

export default function TenantDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const tenant = TENANTS_DATA.find(t => t.id === id)

    const [newCallNote, setNewCallNote] = useState("")
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<any>(null)

    if (!tenant) {
        return (
            <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[50vh]">
                <h1 className="text-2xl font-bold mb-4">Inquilino no encontrado</h1>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
            </div>
        )
    }

    const handleSendEmail = (type: string) => {
        toast.success(`Correo enviado: ${type}`)
    }

    const handleAddCallLog = () => {
        if (!newCallNote.trim()) return

        const newLog = {
            date: new Date().toLocaleString(),
            note: newCallNote,
            user: "Admin"
        }

        // Optimistic update
        tenant.callLog.unshift(newLog)
        setNewCallNote("")
        toast.success("Llamada registrada")
    }

    const handleViewReceipt = (payment: any) => {
        setSelectedPayment(payment)
        setIsReceiptOpen(true)
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        {tenant.name}
                        <Badge variant={tenant.status === 'Moroso' ? 'destructive' : 'default'} className="ml-2">
                            {tenant.status}
                        </Badge>
                    </h1>
                    <div className="flex items-center gap-4 text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" /> {tenant.property}
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" /> {tenant.contractType}
                        </span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" /> Editar Perfil
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="info" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="info">Información</TabsTrigger>
                    <TabsTrigger value="payments">Pagos</TabsTrigger>
                    <TabsTrigger value="contracts">Contratos</TabsTrigger>
                    <TabsTrigger value="followup">Seguimiento</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5" /> Datos Personales
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Nombre Completo</Label>
                                    <p className="font-medium">{tenant.name}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Documento de Identidad</Label>
                                    <p className="font-medium">{tenant.docId}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Phone className="h-5 w-5" /> Contacto
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Teléfono</Label>
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium">{tenant.phone}</p>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600">
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                                <PhoneOutgoing className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Correo Electrónico</Label>
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium">{tenant.email}</p>
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5" /> Información del Contrato
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Tipo de Contrato</Label>
                                    <p className="font-medium">{tenant.contractType}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Propiedad</Label>
                                    <p className="font-medium">{tenant.property}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Canon Mensual</Label>
                                    <p className="font-medium text-green-600">$400.00</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Historial de Pagos</CardTitle>
                                <Button variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" /> Exportar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Estatus</TableHead>
                                        <TableHead className="text-right">Recibo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenant.paymentHistory?.map((payment, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{payment.date}</TableCell>
                                            <TableCell>{payment.concept}</TableCell>
                                            <TableCell className="font-medium">{payment.amount}</TableCell>
                                            <TableCell>
                                                <Badge variant={payment.status === 'Pagado' ? 'default' : 'secondary'}>
                                                    {payment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {payment.status === 'Pagado' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(payment)}>
                                                        <FileText className="h-4 w-4 mr-2" /> Recibo
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contracts">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Historial de Contratos</CardTitle>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Contrato
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>N° Contrato</TableHead>
                                        <TableHead>Inmueble</TableHead>
                                        <TableHead>Inicio</TableHead>
                                        <TableHead>Fin</TableHead>
                                        <TableHead>Estatus</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">CNT-2024-001</TableCell>
                                        <TableCell>{tenant.property}</TableCell>
                                        <TableCell>01/01/2024</TableCell>
                                        <TableCell>31/12/2024</TableCell>
                                        <TableCell><Badge>Vigente</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="opacity-60">
                                        <TableCell className="font-medium">CNT-2023-089</TableCell>
                                        <TableCell>{tenant.property}</TableCell>
                                        <TableCell>01/01/2023</TableCell>
                                        <TableCell>31/12/2023</TableCell>
                                        <TableCell><Badge variant="outline">Vencido</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="followup" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => handleSendEmail("Recordatorio de Pago")}>
                                    <Mail className="h-6 w-6" />
                                    <span>Enviar Recordatorio</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => handleSendEmail("Aviso de Cobro")}>
                                    <DollarSign className="h-6 w-6" />
                                    <span>Aviso de Cobro</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => handleSendEmail("Notificación General")}>
                                    <Send className="h-6 w-6" />
                                    <span>Notificación</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                                    <FileText className="h-6 w-6" />
                                    <span>Generar Solvencia</span>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Last Interaction */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Última Interacción</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-100 p-2 rounded-full">
                                            <Mail className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Correo Enviado: {tenant.lastEmail?.type}</p>
                                            <p className="text-sm text-muted-foreground">{tenant.lastEmail?.date}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-start gap-3">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <Phone className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Última Llamada</p>
                                            <p className="text-sm text-muted-foreground">
                                                {tenant.callLog?.[0]?.date || "No registrada"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Call Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Bitácora de Llamadas y Notas</span>
                                <Badge variant="outline" className="font-normal">
                                    {tenant.callLog?.length || 0} registros
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Textarea
                                    placeholder="Escriba una nota sobre la llamada o gestión..."
                                    value={newCallNote}
                                    onChange={(e) => setNewCallNote(e.target.value)}
                                    className="resize-none"
                                />
                                <Button className="h-auto" onClick={handleAddCallLog}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <ScrollArea className="h-[200px] pr-4">
                                <div className="space-y-4">
                                    {tenant.callLog?.map((log, index) => (
                                        <div key={index} className="flex gap-4 p-3 border rounded-lg bg-muted/30">
                                            <div className="mt-1">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-foreground">{log.user}</p>
                                                    <span className="text-xs text-muted-foreground">{log.date}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {log.note}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* RECEIPT DIALOG */}
            <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Recibo de Pago</DialogTitle>
                    </DialogHeader>
                    {/* Placeholder for receipt content */}
                    <div className="p-4 border rounded-md bg-muted/20 min-h-[300px] flex items-center justify-center text-muted-foreground">
                        Vista previa del recibo
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Cerrar</Button>
                        <Button onClick={() => window.print()}>
                            <PrinterIcon className="mr-2 h-4 w-4" /> Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
