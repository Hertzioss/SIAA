"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PaymentForm } from "@/components/tenants/payment-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function NewPaymentPage() {
    const router = useRouter()

    return (
        <div className="space-y-3 p-4 md:p-5 max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Registro de Pago</h1>
                    <p className="text-xs text-muted-foreground">
                        Seleccione el inquilino, ingrese el monto y concilie desde una sola vista.
                    </p>
                </div>
            </div>
            <Card>
                <CardContent className="p-4 md:p-5">
                    <PaymentForm
                        isAdmin={true}
                        onSuccess={() => {
                            toast.success("Pago registrado correctamente")
                            router.push('/payments')
                        }}
                        onCancel={() => router.back()}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
