"use client"

import { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/utils"
import { PaymentReceipt } from "@/components/payment-receipt"
import { PaymentWithDetails } from "@/types/payment"
import { useSystemConfig } from "@/hooks/use-system-config" // Import hook

interface PrintableReceiptHandlerProps {
    payment: PaymentWithDetails
    onClose: () => void
}

/**
 * Manejador para la impresión de recibos.
 * Renderiza el recibo de forma invisible y gestiona el diálogo de impresión del navegador.
 */
export function PrintableReceiptHandler({ payment, onClose }: PrintableReceiptHandlerProps) {
    const printRef = useRef<HTMLDivElement>(null)
    const { config, loading } = useSystemConfig() // Get system config

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Recibo-${payment.id}`,
        onAfterPrint: onClose,
    })

    useEffect(() => {
        // Wait for config to finish loading before triggering print
        if (loading) return
        if (printRef.current) {
            // Small delay to ensure image loading if any
            const timer = setTimeout(() => {
                handlePrint()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [handlePrint, config, loading]) // Add loading dependency to wait for config

    if (!payment) return null

    // Logic to determine logo:
    // 1. System Config Logo (priority)
    // 2. Owner Logo (fallback)
    const ownerLogo = payment.contracts?.units?.properties?.property_owners?.find((po: { owners: { name: string; doc_id: string; logo_url?: string | null } }) => po.owners?.logo_url)?.owners?.logo_url
    const finalLogo = ownerLogo || config?.logo_url || null

    // Company info for the receipt - always use system config
    const companyName = config?.name || "Escritorio Legal"
    const companyRif = config?.rif || ""

    return (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
            <PaymentReceipt
                ref={printRef}
                payment={{
                    date: format(parseLocalDate(payment.date), 'dd-MM-yyyy'),
                    id: payment.id,
                    amount: payment.amount.toString(),
                    concept: payment.concept ?? '',
                    status: payment.status,
                    reference: payment.reference_number ?? undefined,
                    rate: payment.exchange_rate ?? undefined,
                    amountBs: payment.currency === 'VES' ? payment.amount : 0,
                    amountUsd: payment.currency === 'USD' ? payment.amount : 0
                }}
                tenant={{
                    name: payment.tenants?.name || "Inquilino",
                    docId: payment.tenants?.doc_id || "",
                    property: `${payment.contracts?.units?.properties?.name || ''} - ${payment.contracts?.units?.name || ''}`.trim() || "Propiedad",
                    propertyType: payment.contracts?.units?.type || "local"
                }}
                company={{
                     name: companyName,
                     rif: companyRif,
                     phone: config?.phone || ''
                }}
                owners={payment.contracts?.units?.properties?.property_owners?.map((po: { owners: { name: string; doc_id: string; logo_url?: string | null } }) => ({
                    name: po.owners?.name,
                    docId: po.owners?.doc_id
                })) || []}
                logoSrc={finalLogo}
            />
        </div>
    )
}
