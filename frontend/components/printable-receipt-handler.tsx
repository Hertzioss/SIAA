"use client"

import { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { format } from "date-fns"
import { PaymentReceipt } from "@/components/payment-receipt"

interface PrintableReceiptHandlerProps {
    payment: any
    onClose: () => void
}

export function PrintableReceiptHandler({ payment, onClose }: PrintableReceiptHandlerProps) {
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Recibo-${payment.id}`,
        onAfterPrint: onClose,
    })

    useEffect(() => {
        // Auto-trigger print when mounted and ref is ready
        if (printRef.current) {
            handlePrint()
        }
    }, [handlePrint])

    if (!payment) return null

    return (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
            <PaymentReceipt
                ref={printRef}
                payment={{
                    date: format(new Date(payment.date), 'dd/MM/yyyy'),
                    amount: payment.amount.toString(),
                    concept: payment.concept,
                    status: payment.status,
                    reference: payment.reference_number,
                    rate: payment.exchange_rate,
                    amountBs: payment.currency === 'VES' ? payment.amount : 0,
                    amountUsd: payment.currency === 'USD' ? payment.amount : 0
                }}
                tenant={{
                    name: payment.tenants?.name || "Inquilino",
                    docId: payment.tenants?.doc_id || "",
                    property: `${payment.contracts?.units?.properties?.name || ''} - ${payment.contracts?.units?.name || ''}`.trim() || "Propiedad"
                }}
            />
        </div>
    )
}
