"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Calendar as CalendarIcon, CloudUpload, Loader2, DollarSign, Wallet, Search, User, Check } from "lucide-react"
import { useTenantPayments, PaymentInsert } from "@/hooks/use-tenant-payments"
import { useTenants } from "@/hooks/use-tenants"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useContracts } from "@/hooks/use-contracts"
import { fetchBcvRate } from "@/services/exchange-rate"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tenant } from "@/types/tenant"
import { PaymentForm } from "./payment-form"

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tenant: Tenant | undefined
}

/**
 * Diálogo para registrar pagos manuales de inquilinos.
 * Permite ingresar montos en Bs/USD, referencia bancaria y adjuntar comprobantes.
 */
export function PaymentDialog({ open, onOpenChange, tenant }: PaymentDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Pago {tenant ? `- ${tenant.name}` : ''}</DialogTitle>
                    <DialogDescription>
                        Ingrese los detalles del pago recibido.
                    </DialogDescription>
                </DialogHeader>

                <PaymentForm
                    defaultTenant={tenant}
                    onSuccess={() => onOpenChange(false)}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
