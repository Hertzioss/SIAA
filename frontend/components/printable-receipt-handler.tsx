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
    const { config, loading } = useSystemConfig() // Get system config

    const paymentsList = payments || (payment ? [payment] : [])
    const firstPayment = paymentsList[0]

    const documentDate = firstPayment?.date && isValid(parseLocalDate(firstPayment?.date)) 
        ? format(parseLocalDate(firstPayment.date), 'dd-MM-yyyy') 
        : (firstPayment?.date || 'SinFecha')
    const tenantName = firstPayment?.tenants?.name || "Inquilino"

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Recibo ${tenantName} ${documentDate}`,
        onAfterPrint: onClose,
    })

    useEffect(() => {
        // Wait for config to finish loading before triggering print
        if (loading) return
        if (printRef.current && paymentsList.length > 0) {
            // Small delay to ensure image loading if any
            const timer = setTimeout(() => {
                handlePrint()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [handlePrint, config, loading, paymentsList.length]) // Add loading dependency to wait for config

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
                    let ownerLogo: string | null = null;
                    if (Array.isArray(propertyOwners)) {
                        ownerLogo = propertyOwners.find((po: any) => po.owners?.logo_url)?.owners?.logo_url || null;
                    }

                    const finalLogo = ownerLogo || config?.logo_url || null

                    // Helper: first owner's RIF (doc_id)
                    const firstOwnerDocId = (Array.isArray(propertyOwners) && propertyOwners.length > 0) 
                        ? propertyOwners[0]?.owners?.doc_id 
                        : "";

                    // Company info for the receipt
                    const companyName = config?.name || "Escritorio Legal"
                    const companyRif = config?.rif?.trim() ? config.rif : firstOwnerDocId

                    // Map owners for the component
                    const ownersList = Array.isArray(propertyOwners) 
                        ? propertyOwners.map((po: any) => ({
                            name: po.owners?.name,
                            docId: po.owners?.doc_id
                        })).filter(o => o.name)
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
                                    amountBs: p.currency === 'VES' ? p.amount : (p.exchange_rate ? p.amount * p.exchange_rate : 0),
                                    amountUsd: p.currency === 'USD' ? p.amount : (p.exchange_rate ? p.amount / p.exchange_rate : 0),
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
