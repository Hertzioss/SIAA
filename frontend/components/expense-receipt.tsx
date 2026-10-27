import React from 'react'
import QRCode from "react-qr-code"
import { numberToWords } from "@/lib/number-to-words"

interface ExpenseReceiptProps {
    expense: {
        id?: string
        date: string
        amount: number
        currency: string
        description?: string
        category?: string
        status?: string
        exchange_rate?: number
    }
    owner: {
        name: string
        docId: string
    }
    company?: {
        name: string
        rif: string
        phone?: string
        email?: string
    }
    processedBy?: string
    authorizedBy?: string
    logoSrc?: string | null
    timezone?: string
}

export const ExpenseReceipt = React.forwardRef<HTMLDivElement, ExpenseReceiptProps>(
    ({ expense, owner, company, processedBy, authorizedBy, logoSrc, timezone }, ref) => {
        const tz = timezone || 'America/Caracas'
        const amountUsd = expense.currency === 'USD' ? expense.amount : (expense.exchange_rate ? expense.amount / expense.exchange_rate : 0)
        const amountBs = expense.currency === 'VES' ? expense.amount : (expense.exchange_rate ? expense.amount * expense.exchange_rate : 0)
        const displayAmount = expense.currency === 'USD' ? amountUsd : amountBs

        return (
            <div ref={ref} className="relative bg-white p-2 mx-auto text-black font-sans text-xs shadow-lg print:shadow-none" style={{ width: '8.5in', minHeight: '5.5in', maxHeight: '5.5in', overflow: 'hidden' }}>
                <div className="h-full border-2 border-black px-4 py-2 relative flex flex-col justify-between">

                    {/* QR Code */}
                    <div className="absolute top-2 right-2 opacity-100 z-10">
                        <div className="w-12 h-12 bg-white p-0.5">
                            <QRCode
                                value={expense.id || 'N/A'}
                                size={48}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                        <p className="text-[6px] text-center mt-0.5 text-gray-400">{expense.id?.substring(0, 8)}</p>
                    </div>

                    <div>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-1 w-1/5 text-center min-h-[60px] flex flex-col items-center justify-center">
                                {logoSrc ? (
                                    <div className="relative w-full h-14">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={logoSrc}
                                            alt="Logo"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="font-bold text-sm uppercase">{company?.name || "Escritorio Legal"}</h2>
                                        <div className="flex justify-center gap-0.5 mt-0.5">
                                            {[...Array(5)].map((_, i) => <div key={i} className="w-1.5 h-1.5 border border-gray-400 rotate-45"></div>)}
                                        </div>
                                        <p className="text-[8px] mt-0.5">RIF: {company?.rif || "J-12345678-9"}</p>
                                    </>
                                )}
                            </div>
                            <div className="flex-1 text-center pt-1 pr-14">
                                <h1 className="font-bold text-sm uppercase px-2">COMPROBANTE DE EGRESO</h1>
                            </div>
                        </div>

                        {/* Amount in words */}
                        <div className="flex mb-2 bg-gray-100/50 py-1.5 items-center">
                            <div className="w-44 shrink-0 font-bold text-[10px] uppercase text-gray-900">POR $:</div>
                            <div className="flex-1 text-left px-3">
                                <span className="font-bold text-sm text-gray-900">
                                    $ {displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-gray-600 ml-2 uppercase">
                                    ({numberToWords(displayAmount, expense.currency === 'USD' ? 'USD' : 'VES')})
                                </span>
                            </div>
                        </div>

                        {/* Beneficiary Info */}
                        <div className="flex mb-1 items-center border-b border-gray-200 pb-0.5">
                            <div className="w-44 shrink-0 font-bold text-[10px] uppercase text-gray-600">BENEFICIARIO:</div>
                            <div className="flex-1 bg-gray-100 px-3 py-0.5 font-bold uppercase text-left tracking-wider text-[10px]">{owner.name}</div>
                        </div>

                        <div className="flex mb-2 items-center">
                            <div className="w-44 shrink-0 font-bold text-[10px] uppercase text-gray-600">CÉDULA / RIF:</div>
                            <div className="font-mono bg-gray-100 px-3 py-0.5 font-bold uppercase text-left tracking-wider text-[10px]">{owner.docId}</div>
                        </div>

                        {/* Concept */}
                        <div className="flex mb-2 items-center text-[10px]">
                            <div className="w-44 shrink-0 font-bold uppercase text-gray-600">CONCEPTO:</div>
                            <div className="flex-1 font-bold uppercase bg-gray-100 px-3 py-0.5">{expense.category || 'EGRESO'}</div>
                        </div>

                        {/* Date */}
                        <div className="flex mb-2 items-center text-[10px]">
                            <div className="w-44 shrink-0 font-bold uppercase text-gray-600">FECHA:</div>
                            <div className="font-mono bg-gray-100 px-3 py-0.5">{expense.date}</div>
                        </div>

                        {/* Observation */}
                        <div className="mb-2">
                            <div className="flex items-start mb-0.5">
                                <div className="w-44 shrink-0 font-bold text-[10px] uppercase pt-0.5 text-gray-600">OBSERVACIÓN:</div>
                                <div className="flex-1 text-left font-bold uppercase text-[10px] leading-tight bg-gray-100 px-3 py-0.5">
                                    {expense.description?.toUpperCase() || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="bg-gray-50/80 p-2 mb-2 text-[10px] border-t border-b border-gray-200 space-y-1">
                            <div className="flex items-center">
                                <div className="w-44 shrink-0 font-bold uppercase text-gray-600">MONEDA:</div>
                                <div className="font-mono text-[10px]">{expense.currency || 'USD'}</div>
                            </div>
                            <div className="flex items-center">
                                <div className="w-44 shrink-0 font-bold uppercase text-gray-600">TASA:</div>
                                <div className="font-mono text-[10px]">{expense.exchange_rate?.toFixed(2) || '—'}</div>
                            </div>
                            <div className="flex items-center pt-1.5 mt-1.5 border-t border-gray-300">
                                <div className="w-44 shrink-0 font-bold uppercase text-gray-900 text-[10px]">TOTAL:</div>
                                <div className="font-mono font-bold text-[10px]">$ {amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                {expense.currency === 'VES' && amountBs > 0 && (
                                    <div className="font-mono font-bold text-[10px] ml-4">Bs. {amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        {/* Processed / Authorized / Conforme */}
                        <div className="flex justify-between w-full gap-8 px-2 mb-2">
                            <div className="text-center w-1/3 border-t border-gray-300 pt-1">
                                <div className="uppercase text-gray-500 text-[9px]">Procesado Por</div>
                                <div className="uppercase text-[9px] font-bold mt-1">{processedBy || '_______________'}</div>
                            </div>
                            <div className="text-center w-1/3 border-t border-gray-300 pt-1">
                                <div className="uppercase text-gray-500 text-[9px]">Autorizado Por</div>
                                <div className="uppercase text-[9px] font-bold mt-1">{authorizedBy || '_______________'}</div>
                            </div>
                            <div className="text-center w-1/3 border-t border-gray-300 pt-1">
                                <div className="uppercase text-gray-500 text-[9px]">Recibo Conforme</div>
                                <div className="uppercase text-[9px] font-bold mt-1">_______________</div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-300 pt-1 text-[8px] text-gray-900 text-left space-y-0.5">
                            <p>Caracas, {new Date().toLocaleDateString('es-VE', { timeZone: tz })} {new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: tz })}</p>
                            <div className="flex justify-between">
                                <div>
                                    Elaborado por: <span className="font-bold">{company?.name || 'Escritorio Legal'}</span> | Telf: <span className="font-bold">{company?.phone || ''}</span> | RIF: <span className="font-bold">{company?.rif || ''}</span>
                                </div>
                                <div>
                                    <span className="font-bold"> www.escritorio.legal | {company?.email || ''} </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
)

ExpenseReceipt.displayName = "ExpenseReceipt"
