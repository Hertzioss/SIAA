"use client"

import { useEffect, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { ExpenseReceipt } from "@/components/expense-receipt"
import { useSystemConfig } from "@/hooks/use-system-config"
import { OwnerExpense } from "@/types/owner-expense"

interface ExpensePrintHandlerProps {
    expense: OwnerExpense
    onClose: () => void
}

export function ExpensePrintHandler({ expense, onClose }: ExpensePrintHandlerProps) {
    const printRef = useRef<HTMLDivElement>(null)
    const { config, loading } = useSystemConfig()

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Comprobante Egreso ${expense.date}`,
        onAfterPrint: onClose,
    })

    useEffect(() => {
        if (loading) return
        if (printRef.current) {
            const timer = setTimeout(() => {
                handlePrint()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [handlePrint, config, loading])

    return (
        <div style={{ position: "fixed", top: "-9999px", left: "-9999px" }}>
            <div ref={printRef}>
                <ExpenseReceipt
                    expense={{
                        id: expense.id,
                        date: expense.date,
                        amount: expense.amount,
                        currency: expense.currency,
                        description: expense.description,
                        category: expense.category,
                        status: expense.status,
                        exchange_rate: expense.exchange_rate,
                    }}
                    owner={{
                        name: expense.owner?.name || "Propietario",
                        docId: expense.owner?.doc_id || "",
                    }}
                    company={{
                        name: config?.name || "Escritorio Legal",
                        rif: config?.rif || "",
                        phone: config?.phone || "",
                        email: config?.email || "",
                    }}
                    logoSrc={config?.logo_url || null}
                    timezone={config?.timezone || 'America/Caracas'}
                />
            </div>
        </div>
    )
}
