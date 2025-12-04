import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Calendar as CalendarIcon, CloudUpload } from "lucide-react"

export default function PaymentForm() {
    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Formulario de Pagos</h1>
                <p className="text-muted-foreground">Ingrese los detalles para registrar un nuevo pago de su arrendamiento.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles del Pago</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="space-y-2">
                                <Label>Propiedad / Unidad</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input defaultValue="Edificio Central - Unidad 302" className="pl-9 bg-muted/50" readOnly />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mes del Pago</Label>
                                    <Select defaultValue="julio">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione mes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="julio">Julio</SelectItem>
                                            <SelectItem value="agosto">Agosto</SelectItem>
                                            <SelectItem value="septiembre">Septiembre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Año del Pago</Label>
                                    <Select defaultValue="2024">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione año" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fecha del Pago</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input type="text" placeholder="07/29/2024" className="pl-9" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Número de Referencia</Label>
                                    <Input placeholder="Ej: 0123456789" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Monto y Moneda</Label>
                                <div className="flex gap-2">
                                    <Input placeholder="0.00" className="flex-1" />
                                    <div className="flex rounded-md border bg-muted p-1">
                                        <Button variant="ghost" size="sm" className="bg-background shadow-sm h-7 px-3">USD</Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-3 text-muted-foreground">VES</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Comprobante de Pago (Opcional)</Label>
                                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                                    <div className="flex flex-col items-center gap-2">
                                        <CloudUpload className="h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm font-medium">Haga clic para cargar <span className="text-muted-foreground font-normal">o arrastre y suelte</span></p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG o PDF (MAX. 5MB)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas / Comentarios</Label>
                                <Textarea placeholder="Abono parcial correspondiente a julio." className="resize-none" rows={4} />
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Mi Estado de Cuenta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Estado Actual:</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400">Al Día</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Saldo Deudor:</span>
                                <span className="font-bold">$ 0.00</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Cálculo Contable</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasa BCV del Día:</span>
                                <span className="font-medium">36.45 VES</span>
                            </div>

                            <Separator />

                            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total a Registrar (VES):</span>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">3,645.00</div>
                                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">VES</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <Button variant="secondary" size="lg">Cancelar</Button>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">Registrar Pago</Button>
            </div>
        </div>
    )
}