"use client"

import { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { format, isValid } from "date-fns"
import { parseLocalDate } from "@/lib/utils"
import { PaymentReceipt } from "@/components/payment-receipt"
import { PaymentWithDetails } from "@/types/payment"
import { useSystemConfig } from "@/hooks/use-system-config" // Import hook

interface PrintableReceiptHandlerProps {
    payment?: PaymentWithDetails
    payments?: PaymentWithDetails[]
    onClose: () => void
}

/**
 * Manejador para la impresión de recibos.
 * Renderiza el recibo de forma invisible y gestiona el diálogo de impresión del navegador.
 */
export function PrintableReceiptHandler({ payment, payments, onClose }: PrintableReceiptHandlerProps) {
    const printRef = useRef<HTMLDivElement>(null)
    const onCloseRef = useRef(onClose)
    const hasPrintedRef = useRef(false)
    const { config, loading } = useSystemConfig() // Get system config

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    const paymentsList = payments || (payment ? [payment] : [])
    const firstPayment = paymentsList[0]
    const printKey = paymentsList.map((p) => `${p.id}:${p.amount}:${p.concept ?? ''}`).join('|')

    const documentDate = firstPayment?.date && isValid(parseLocalDate(firstPayment?.date)) 
        ? format(parseLocalDate(firstPayment.date), 'dd-MM-yyyy') 
        : (firstPayment?.date || 'SinFecha')
    const tenantName = firstPayment?.tenants?.name || "Inquilino"

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Recibo ${tenantName} ${documentDate}`,
        onAfterPrint: () => onCloseRef.current(),
    })

    const handlePrintRef = useRef(handlePrint)
    useEffect(() => {
        handlePrintRef.current = handlePrint
    }, [handlePrint])

    useEffect(() => {
        hasPrintedRef.current = false
    }, [printKey])

    useEffect(() => {
        // Wait for config to finish loading before triggering print
        if (loading || hasPrintedRef.current) return
        if (printRef.current && paymentsList.length > 0) {
            // Small delay to ensure image loading if any
            const timer = setTimeout(() => {
                if (!hasPrintedRef.current) {
                    hasPrintedRef.current = true
                    handlePrintRef.current()
                }
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [loading, printKey, paymentsList.length])

    if (paymentsList.length === 0) return null

    return (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
            <div ref={printRef}>
                {paymentsList.map((p, index) => {
                    // Robust data resolution for nested Supabase joins (handling both single objects and arrays)
                    const contractData = Array.isArray(p.contracts) ? p.contracts[0] : p.contracts;
                    const unitData = Array.isArray(contractData?.units) ? contractData?.units[0] : contractData?.units;
                    const propertyData = Array.isArray(unitData?.properties) ? unitData?.properties[0] : unitData?.properties;
                    const propertyOwners = propertyData?.property_owners;

                    // Logic to determine logo:
                    // 1. Owner Logo (priority if exists in property owners)
                    // 2. System Config Logo (fallback)
                    type PropertyOwnerJoin = { owners?: { name?: string; doc_id?: string; logo_url?: string | null } | null }
                    let ownerLogo: string | null = null;
                    if (Array.isArray(propertyOwners)) {
                        ownerLogo = (propertyOwners as PropertyOwnerJoin[]).find((po) => po.owners?.logo_url)?.owners?.logo_url || null;
                    }

                    const finalLogo = ownerLogo || config?.logo_url || null

                    // Helper: first owner's RIF (doc_id)
                    const firstOwnerDocId = (Array.isArray(propertyOwners) && propertyOwners.length > 0) 
                        ? (propertyOwners as PropertyOwnerJoin[])[0]?.owners?.doc_id || ""
                        : "";

                    // Company info for the receipt
                    const companyName = config?.name || "Escritorio Legal"
                    const companyRif = config?.rif?.trim() ? config.rif : firstOwnerDocId

                    // Map owners for the component
                    const ownersList = Array.isArray(propertyOwners) 
                        ? (propertyOwners as PropertyOwnerJoin[]).map((po) => ({
                            name: po.owners?.name || '',
                            docId: po.owners?.doc_id || ''
                        })).filter((o) => Boolean(o.name))
                        : [];

                    return (
                        <div key={p.id || index} style={{ pageBreakAfter: index < paymentsList.length - 1 ? 'always' : 'auto' }}>
                            <PaymentReceipt
                                payment={{
                                    date: p.date && isValid(parseLocalDate(p.date)) ? format(parseLocalDate(p.date), 'dd-MM-yyyy') : p.date || '-',
                                    id: p.id,
                                    amount: p.amount.toString(),
                                    concept: p.concept ?? '',
                                    status: p.status,
                                    reference: p.reference_number ?? undefined,
                                    rate: p.exchange_rate ?? undefined,
                                    amountBs:
                                        typeof p.metadata?.consolidated_amount_bs === 'number'
                                            ? p.metadata.consolidated_amount_bs
                                            : p.currency === 'VES'
                                              ? p.amount
                                              : p.exchange_rate
                                                ? p.amount * p.exchange_rate
                                                : 0,
                                    amountUsd:
                                        typeof p.metadata?.consolidated_amount_usd === 'number'
                                            ? p.metadata.consolidated_amount_usd
                                            : p.currency === 'USD'
                                              ? p.amount
                                              : p.exchange_rate
                                                ? p.amount / p.exchange_rate
                                                : 0,
                                    currency: p.currency || undefined,
                                    metadata: p.metadata
                                }}
                                tenant={{
                                    name: p.tenants?.name || "Inquilino",
                                    docId: p.tenants?.doc_id || "",
                                    property: `${propertyData?.name || ''} - ${unitData?.name || ''}`.trim() || "Inmueble",
                                    propertyType: unitData?.type || "local"
                                }}
                                company={{
                                    name: companyName,
                                    rif: companyRif,
                                    phone: config?.phone || '',
                                    email: config?.email || ''
                                }}
                                owners={ownersList}
                                logoSrc={finalLogo}
                                timezone={config?.timezone || 'America/Caracas'}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
