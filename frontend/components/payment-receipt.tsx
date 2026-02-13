import React from 'react'
import QRCode from "react-qr-code"

interface PaymentReceiptProps {
    payment: {
        date: string
        amount: string
        id?: string
        concept: string
        status: string
        reference?: string
        bankOrigin?: string
        bankDest?: string
        rate?: number
        amountBs?: number
        amountUsd?: number
    }
    tenant: {
        name: string
        docId: string
        property: string
        propertyType?: string
    }
    company?: {
        name: string
        rif: string
        phone?: string
        email?: string
    }
    owners?: {
        name: string
        docId: string
    }[]
    logoSrc?: string | null
}

/**
 * Componente visual del recibo de pago.
 * Diseñado para ser impreso, muestra todos los detalles del pago, inquilino, propiedad y montos.
 */
export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(({ payment, tenant, company, owners, logoSrc }, ref) => {
    // Helper to parse amount string to number if needed
    const parseAmount = (str: string) => parseFloat(str.replace(/[^0-9.-]+/g, ""))

    const paymentReceiptProps = { payment, tenant, company, owners, logoSrc }

    const amountVal = parseAmount(payment.amount)
    const rate = payment.rate || 65.26 // Mock rate if missing
    const amountBs = payment.amountBs ?? (amountVal * rate)
    const amountUsd = payment.amountUsd ?? amountVal

    return (
        <div ref={ref} className="relative bg-white px-5 py-3 mx-auto text-black font-sans text-xs border border-gray-300" style={{ width: '8.5in', minHeight: '5.5in', maxHeight: '5.5in', overflow: 'hidden' }}>
            {/* QR Code - top right corner */}
            <div className="absolute top-2 right-2 opacity-100">
                <div className="w-12 h-12 bg-white p-0.5">
                    <QRCode
                        value={payment.id || payment.reference || 'N/A'}
                        size={48}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                </div>
                <p className="text-[6px] text-center mt-0.5 text-gray-400">{payment.id?.substring(0, 8)}</p>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="p-1 w-1/5 text-center min-h-[60px] flex flex-col items-center justify-center">
                    {paymentReceiptProps.logoSrc ? (
                        <div className="relative w-full h-14">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={paymentReceiptProps.logoSrc} 
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
                    <p className="text-[9px] uppercase text-gray-500 mb-0.5">COPIA DE ADMINISTRACION</p>
                    <h1 className="font-bold text-sm uppercase px-2">COMPROBANTE DE PAGO POR CANON DE ARRENDAMIENTO</h1>
                </div>
            </div>

            {/* Amounts */}
            <div className="flex mb-2 bg-gray-100/50 p-1.5 items-center">
                <div className="w-24 font-bold uppercase tracking-wide text-[10px]">RECIBO POR:</div>
                <div className="flex-1 flex justify-end gap-8 pr-6">
                    <div className="text-right min-w-[100px]">
                        <div className="font-bold text-sm">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                        <div className="font-bold text-gray-400 text-xs">{amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</div>
                    </div>
                    <div className="text-left font-bold uppercase text-[10px] flex flex-col justify-center">
                        <div>BOLIVARES</div>
                        <div className="text-gray-400">DOLARES</div>
                    </div>
                </div>
            </div>

            {/* Payer Info */}
            <div className="flex mb-1 items-center border-b border-gray-200 pb-0.5">
                <div className="w-44 shrink-0 font-bold text-[10px] uppercase text-gray-600">NOMBRE DEL CONSIGNANTE:</div>
                <div className="flex-1 bg-gray-100 px-3 py-0.5 font-bold uppercase text-left tracking-wider text-sm text-[10px]">{tenant.name}</div>
            </div>

            <div className="flex mb-2 items-center">
                <div className="w-44 shrink-0 font-bold text-[10px] uppercase text-gray-600">CEDULA / RIF :</div>
                <div className="font-mono bg-gray-100 px-3 py-0.5 font-bold uppercase text-left tracking-wider text-sm text-[10px]">{tenant.docId}</div>
            </div>

            {/* Property Info */}
            <div className="flex mb-2 items-center text-[10px]">
                <div className="w-44 shrink-0 font-bold uppercase text-gray-600">TIPO DE INMUEBLE:</div>
                <div className="flex items-center gap-1.5">
                    <div className="font-bold uppercase px-3 py-0.5 text-center bg-gray-100">{{
                        'apartment': 'APARTAMENTO',
                        'office': 'OFICINA',
                        'local': 'LOCAL',
                        'storage': 'DEPÓSITO'
                    }[tenant.propertyType || 'local'] || (tenant.propertyType || 'LOCAL').toUpperCase()}</div>
                    <div className="font-bold uppercase text-gray-600 ml-2">No.</div>
                    <div className="font-bold uppercase bg-gray-100 px-1.5 py-0.5 min-w-[50px] text-center">{tenant.property.split('-')[1]?.trim() || '-'}</div>
                    <div className="font-bold uppercase text-gray-600 ml-2">EDIFICIO:</div>
                    <div className="font-bold uppercase bg-gray-100 px-3 py-0.5 text-left">{tenant.property.split('-')[0]?.trim() || tenant.property}</div>
                </div>
            </div>

            {/* Owner Info */}
            {owners && owners.length > 0 && (
                <div className="flex mb-2 items-center text-[10px]">
                    <div className="w-44 shrink-0 font-bold uppercase text-gray-600">PROPIETARIO(S):</div>
                    <div className="flex-1 font-bold uppercase text-[10px] bg-gray-100 px-3 py-0.5">
                        {owners.map(o => `${o.name} / ${o.docId}`).join(' — ')}
                    </div>
                </div>
            )}

            {/* Observation */}
            <div className="mb-2">
                <div className="flex items-start mb-0.5">
                    <div className="w-44 shrink-0 font-bold text-[10px] uppercase pt-0.5 text-gray-600">OBSERVACION:</div>
                    <div className="flex-1 text-left font-bold uppercase text-[10px] leading-tight bg-gray-100 px-3 py-0.5">
                        {payment.concept.toUpperCase()}
                    </div>
                </div>
                <div className="flex">
                    <div className="w-44 shrink-0 font-bold text-[10px] uppercase pt-0.5 text-gray-600"></div>
                    <div className="flex-1 text-left text-[8px] leading-tight px-3 py-0.5">
                        El señalamiento del mes y año del canon de arrendamiento aquí recibido, esta sujeto a verificacion y auditoria
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="bg-gray-50/80 p-2 mb-2 text-[10px] border-t border-b border-gray-200 space-y-1">
                <div className="flex items-center">
                    <div className="w-44 shrink-0 font-bold uppercase text-gray-600">FECHA DEL DEPOSITO:</div>
                    <div className="font-mono text-[10px]">{payment.date.split(' ')[0]}</div>
                </div>

                <div className="flex items-center">
                    <div className="w-44 shrink-0 font-bold uppercase text-gray-600">MONTO EN BOLIVARES:</div>
                    <div className="w-28 shrink-0 font-mono font-bold">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    <div className="font-bold uppercase text-gray-600 ml-4">REFERENCIA:</div>
                    <div className="font-mono ml-2">{payment.reference || "N/A"}</div>
                </div>

                <div className="flex items-center">
                    <div className="w-44 shrink-0 font-bold uppercase text-gray-600">MONTO EN DIVISA:</div>
                    <div className="w-28 shrink-0 font-mono font-bold">{amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</div>
                    <div className="font-bold uppercase text-gray-600 ml-4">TASA:</div>
                    <div className="font-mono ml-2">{rate.toFixed(2)}</div>
                </div>

                {/* Subtotal */}
                <div className="pt-1.5 mt-1.5 border-t border-gray-300 space-y-0.5">
                    <div className="font-bold uppercase text-gray-600 text-[10px] mb-1">SUBTOTAL:</div>
                    <div className="flex items-center">
                        <div className="w-44 shrink-0 font-bold uppercase text-gray-600">BOLIVARES:</div>
                        <div className="font-mono font-bold">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.</div>
                    </div>
                    <div className="flex items-center">
                        <div className="w-44 shrink-0 font-bold uppercase text-gray-600">DIVISAS:</div>
                        <div className="font-mono font-bold">{amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} USD</div>
                    </div>
                    <div className="flex items-center pt-1 border-t border-gray-300">
                        <div className="w-44 shrink-0 font-bold uppercase text-gray-900 text-[10px]">TOTAL Bs.:</div>
                        <div className="font-mono font-bold text-[10px]">{((amountUsd * rate) + amountBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>
            </div>

            {/* Espacio de separacion*/}
            <div className="flex justify-center mb-2 gap-10 font-mono font-bold text-[10px]">
              
            </div>

            {/* Signature lines */}
            <div className="flex justify-between w-full gap-16 mx-4 mb-3">
                <div className="text-center w-1/2 border-t border-black pt-1 uppercase text-gray-500 text-[9px]">
                    firma del consignante
                </div>
                <div className="text-center w-1/2 border-t border-black pt-1 uppercase text-gray-500 text-[9px]">
                    firma de recibido
                </div>
            </div>

            {/* Footer - Company Info */}
            <div className="border-t border-gray-300 pt-1.5 text-[8px] text-gray-900 text-left space-y-0.5">
                <p>Caracas, {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</p>
                <div className="flex justify-between">
                    <div>
                        Impreso por: <span className="font-bold">{company?.name || 'Escritorio Legal'}</span> | Telf: <span className="font-bold">{company?.phone || ''}</span> | RIF: <span className="font-bold">{company?.rif || ''}</span> 
                    </div>
                    <div>
                        <span className="font-bold"> www.escritorio.legal | {company?.email || ''} </span> 
                    </div>
                </div>
            </div>
        </div >
    )
})

PaymentReceipt.displayName = "PaymentReceipt"
