"use client"

import { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { format, isValid } from "date-fns"
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

    const documentDate = payment.date && isValid(parseLocalDate(payment.date)) 
        ? format(parseLocalDate(payment.date), 'dd-MM-yyyy') 
        : (payment.date || 'SinFecha')
    const tenantName = payment.tenants?.name || "Inquilino"

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Recibo ${tenantName} ${documentDate}`,
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

    // Robust data resolution for nested Supabase joins (handling both single objects and arrays)
    const contractData = Array.isArray(payment.contracts) ? payment.contracts[0] : payment.contracts;
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
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
            <PaymentReceipt
                ref={printRef}
                payment={{
                    date: payment.date && isValid(parseLocalDate(payment.date)) ? format(parseLocalDate(payment.date), 'dd-MM-yyyy') : payment.date || '-',
                    id: payment.id,
                    amount: payment.amount.toString(),
                    concept: payment.concept ?? '',
                    status: payment.status,
                    reference: payment.reference_number ?? undefined,
                    rate: payment.exchange_rate ?? undefined,
                    amountBs: payment.currency === 'VES' ? payment.amount : (payment.exchange_rate ? payment.amount * payment.exchange_rate : 0),
                    amountUsd: payment.currency === 'USD' ? payment.amount : (payment.exchange_rate ? payment.amount / payment.exchange_rate : 0),
                    currency: payment.currency || undefined,
                    metadata: payment.metadata
                }}
                tenant={{
                    name: payment.tenants?.name || "Inquilino",
                    docId: payment.tenants?.doc_id || "",
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
}
