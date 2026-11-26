"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tenant } from "@/types/tenant"
import { PaymentForm } from "./payment-form"

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tenant: Tenant | undefined
    isAdmin?: boolean
}

/**
 * Diálogo para registrar pagos manuales de inquilinos.
 * Diseñado en 2 columnas compactas para completar el registro sin scroll en escritorio.
 */
export function PaymentDialog({ open, onOpenChange, tenant, isAdmin = false }: PaymentDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto p-5 gap-3">
                <DialogHeader className="pb-2 border-b space-y-0.5">
                    <DialogTitle className="text-lg">
                        Registrar Pago{tenant ? ` — ${tenant.name}` : ''}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Complete los datos del cobro y verifique el resumen antes de registrar.
                    </DialogDescription>
                </DialogHeader>

                <PaymentForm
                    defaultTenant={tenant}
                    onSuccess={() => onOpenChange(false)}
                    onCancel={() => onOpenChange(false)}
                    isAdmin={isAdmin}
                />
            </DialogContent>
        </Dialog>
    )
}
