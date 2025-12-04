import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Send, Paperclip, Eye, RotateCw, Inbox } from "lucide-react"

export default function NotificationsPage() {
    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Notificaciones</h1>
                    <p className="text-muted-foreground">
                        Administración de correos electrónicos de cobro y recepción de pagos.
                    </p>
                </div>
                <Button>
                    <Mail className="mr-2 h-4 w-4" /> Redactar Nuevo Correo
                </Button>
            </div>

            <Tabs defaultValue="sent" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="sent" className="flex items-center gap-2">
                        <Send className="h-4 w-4" /> Cobros (Enviados)
                    </TabsTrigger>
                    <TabsTrigger value="received" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" /> Pagos (Recibidos)
                    </TabsTrigger>
                </TabsList>

                {/* SENT EMAILS TAB (COLLECTIONS) */}
                <TabsContent value="sent" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Correos Enviados</CardTitle>
                            <CardDescription>Historial de recordatorios y avisos de cobro enviados por correo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unidad / Inquilino</TableHead>
                                        <TableHead>Asunto del Correo</TableHead>
                                        <TableHead>Destinatario</TableHead>
                                        <TableHead>Fecha Envío</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium">REV-204</div>
                                            <div className="text-sm text-muted-foreground">Pedro Sanchez</div>
                                        </TableCell>
                                        <TableCell>Recordatorio de Pago - Julio 2024</TableCell>
                                        <TableCell>pedro.sanchez@email.com</TableCell>
                                        <TableCell>01/07/2024 09:30 AM</TableCell>
                                        <TableCell><Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80">Entregado</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" title="Reenviar">
                                                <RotateCw className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium">TE-201</div>
                                            <div className="text-sm text-muted-foreground">Comercializadora Norte</div>
                                        </TableCell>
                                        <TableCell>Aviso de Cobro - Mantenimiento Extra</TableCell>
                                        <TableCell>admin@comercializadora.com</TableCell>
                                        <TableCell>05/07/2024 02:15 PM</TableCell>
                                        <TableCell><Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100/80">Enviado</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" title="Reenviar">
                                                <RotateCw className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium">REV-101</div>
                                            <div className="text-sm text-muted-foreground">Carlos Ruiz</div>
                                        </TableCell>
                                        <TableCell>Factura #1234 - Agosto 2024</TableCell>
                                        <TableCell>carlos.ruiz@email.com</TableCell>
                                        <TableCell>01/08/2024 10:00 AM</TableCell>
                                        <TableCell><Badge variant="destructive">Fallido</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" title="Reenviar" className="text-destructive hover:text-destructive">
                                                <RotateCw className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* RECEIVED EMAILS TAB (PAYMENTS) */}
                <TabsContent value="received" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Correos Recibidos</CardTitle>
                            <CardDescription>Reportes de pago y comprobantes recibidos vía correo electrónico.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unidad / Inquilino</TableHead>
                                        <TableHead>Asunto</TableHead>
                                        <TableHead>Fecha Recepción</TableHead>
                                        <TableHead className="text-center">Adjunto</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium">REV-101</div>
                                            <div className="text-sm text-muted-foreground">Carlos Ruiz</div>
                                        </TableCell>
                                        <TableCell>Comprobante de Pago Agosto</TableCell>
                                        <TableCell>02/08/2024 11:45 AM</TableCell>
                                        <TableCell className="text-center">
                                            <Paperclip className="h-4 w-4 mx-auto text-muted-foreground" />
                                        </TableCell>
                                        <TableCell><Badge className="bg-yellow-500 hover:bg-yellow-600">Pendiente</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="gap-2">
                                                <Eye className="h-4 w-4" /> Ver Correo
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <div className="font-medium">TE-500</div>
                                            <div className="text-sm text-muted-foreground">Tech Solutions CA</div>
                                        </TableCell>
                                        <TableCell>Transferencia Zelle - Julio</TableCell>
                                        <TableCell>30/07/2024 04:20 PM</TableCell>
                                        <TableCell className="text-center">
                                            <Paperclip className="h-4 w-4 mx-auto text-muted-foreground" />
                                        </TableCell>
                                        <TableCell><Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80">Procesado</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="gap-2">
                                                <Eye className="h-4 w-4" /> Ver Correo
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
