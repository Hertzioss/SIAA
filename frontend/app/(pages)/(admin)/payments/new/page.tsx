"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentForm } from "@/components/tenants/payment-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function NewPaymentPage() {
    const router = useRouter()

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight">Registro de Pago</h1>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Nuevo Pago</CardTitle>
                </CardHeader>
                <CardContent>
                    <PaymentForm
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
