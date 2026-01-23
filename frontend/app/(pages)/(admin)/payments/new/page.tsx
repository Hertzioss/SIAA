"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewPaymentPage() {
    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight">Registro de Pago</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Nuevo Pago</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Formulario de registro de pago (Próximamente)</p>
                </CardContent>
            </Card>
        </div>
    )
}
