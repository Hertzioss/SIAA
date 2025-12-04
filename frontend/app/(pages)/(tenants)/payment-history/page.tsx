import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink } from "lucide-react"

export default function PaymentHistoryPage() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Historial de Pagos</h2>
                <p className="text-muted-foreground">
                    Consulte el estado de sus pagos realizados.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pagos Recientes</CardTitle>
                    <CardDescription>Mostrando los últimos 10 movimientos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Referencia</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-right">Comprobante</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>01/08/2024</TableCell>
                                <TableCell>Renta Agosto 2024</TableCell>
                                <TableCell>Zelle</TableCell>
                                <TableCell>Z-987654321</TableCell>
                                <TableCell className="text-right font-medium">$400.00</TableCell>
                                <TableCell className="text-center">
                                    <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendiente</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>01/07/2024</TableCell>
                                <TableCell>Renta Julio 2024</TableCell>
                                <TableCell>Transferencia</TableCell>
                                <TableCell>0123456789</TableCell>
                                <TableCell className="text-right font-medium">$400.00</TableCell>
                                <TableCell className="text-center">
                                    <Badge className="bg-green-500 hover:bg-green-600">Aprobado</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>15/06/2024</TableCell>
                                <TableCell>Reparación Aire Acondicionado</TableCell>
                                <TableCell>Pago Móvil</TableCell>
                                <TableCell>11223344</TableCell>
                                <TableCell className="text-right font-medium">$50.00</TableCell>
                                <TableCell className="text-center">
                                    <Badge className="bg-green-500 hover:bg-green-600">Aprobado</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>01/06/2024</TableCell>
                                <TableCell>Renta Junio 2024</TableCell>
                                <TableCell>Zelle</TableCell>
                                <TableCell>Z-123456789</TableCell>
                                <TableCell className="text-right font-medium">$400.00</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="destructive">Rechazado</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="text-xs text-muted-foreground">-</span>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
