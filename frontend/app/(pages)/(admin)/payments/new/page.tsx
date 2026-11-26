"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PaymentForm } from "@/components/tenants/payment-form"
import { toast } from "sonner"

export default function NewPaymentPage() {
    const router = useRouter()
    const [formKey, setFormKey] = useState(0)

    const handlePaymentSuccess = () => {
        toast.success("Pago registrado correctamente", {
            description: "El formulario está listo para cargar un nuevo pago.",
        })
        setFormKey((prev) => prev + 1)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    return (
        <div className="space-y-3 p-4 md:p-5 max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Registro de Pago</h1>
                    <p className="text-xs text-muted-foreground">
                        Seleccione el inquilino, ingrese el monto y concilie desde una sola vista.
                    </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/payments">
                        Ir a Conciliación
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>
            <Card>
                <CardContent className="p-4 md:p-5">
                    <PaymentForm
                        key={formKey}
                        isAdmin={true}
                        onSuccess={handlePaymentSuccess}
                        onCancel={() => router.back()}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
