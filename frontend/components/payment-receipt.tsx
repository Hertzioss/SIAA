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
    }
    company?: {
        name: string
        rif: string
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
        <div ref={ref} className="bg-white p-8 max-w-[800px] mx-auto text-black font-sans text-sm border border-gray-300">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="border border-gray-400 p-2 w-1/4 text-center min-h-[100px] flex flex-col items-center justify-center">
                    {paymentReceiptProps.logoSrc ? (
                        <div className="relative w-full h-24 mb-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={paymentReceiptProps.logoSrc} 
                                alt="Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : (
                        <>
                            <p className="text-xs uppercase text-gray-500">sucesión</p>
                            <h2 className="font-bold text-lg uppercase">{company?.name || "Escritorio Legal"}</h2>
                            <div className="flex justify-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => <div key={i} className="w-2 h-2 border border-gray-400 rotate-45"></div>)}
                            </div>
                            <p className="text-[10px] mt-1">RIF: {company?.rif || "J-12345678-9"}</p>
                        </>
                    )}
                </div>
                <div className="flex-1 text-center pt-2">
                    <p className="text-xs uppercase text-gray-500 mb-1">COPIA DE ADMINISTRACION</p>
                    <h1 className="font-bold text-lg uppercase px-4">RECIBO DE RECEPCION DE DINERO POR CANON DE ARRENDAMIENTO</h1>
                </div>
            </div>


            {/* Amounts */}
            <div className="flex mb-4 bg-gray-100/50 p-2 items-center">
                <div className="w-32 font-bold uppercase tracking-wide">RECIBO POR:</div>
                <div className="flex-1 flex justify-end gap-12 pr-8">
                    <div className="text-right min-w-[120px]">
                        <div className="font-bold text-lg">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                        <div className="font-bold text-gray-400">{amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</div>
                    </div>
                    <div className="text-left font-bold uppercase text-sm flex flex-col justify-center">
                        <div>BOLIVARES</div>
                        <div className="text-gray-400">DOLARES</div>
                    </div>
                </div>
            </div>

            {/* Payer Info */}
            <div className="flex mb-2 items-center border-b border-gray-200 pb-1">
                <div className="w-48 font-bold text-xs uppercase text-gray-600">NOMBRE DEL CONSIGNANTE:</div>
                <div className="flex-1 bg-gray-100 px-4 py-1 font-bold uppercase text-center tracking-wider text-base">{tenant.name}</div>
            </div>

            <div className="flex mb-4 items-center gap-4">
                <div className="font-bold text-xs uppercase text-gray-600">CEDULA DE IDENTIDAD No.:</div>
                <div className="font-mono text-sm">{tenant.docId}</div>
            </div>

            {/* Property Info */}
            <div className="flex mb-4 items-center gap-2 text-xs">
                <div className="font-bold uppercase text-gray-600">TIPO DE INMUEBLE:</div>
                <div className="font-bold uppercase px-4 text-center">LOCAL</div>

                <div className="font-bold uppercase text-gray-600 ml-4">No.</div>
                <div className="font-bold uppercase bg-gray-200 px-2 py-0.5 min-w-[60px] text-center">{tenant.property.split('-')[1]?.trim() || 'PB-1'}</div>

                <div className="font-bold uppercase text-gray-600 ml-4">EDIFICIO:</div>
                <div className="flex-1 font-bold uppercase bg-gray-100 px-4 py-0.5 text-center">{tenant.property.split('-')[0]?.trim() || tenant.property}</div>
            </div>

            {/* Owner Info */}
            {owners && owners.length > 0 && (
                <div className="flex mb-4 items-center gap-2 text-xs">
                    <div className="font-bold uppercase text-gray-600">PROPIETARIO(S):</div>
                    <div className="flex-1 font-bold uppercase text-sm">
                        {owners.map(o => o.name).join(' / ')}
                    </div>
                </div>
            )}

            {/* Observation */}
            <div className="mb-6">
                <div className="flex items-start gap-2 mb-1">
                    <div className="font-bold text-xs uppercase w-32 pt-1 text-gray-600">OBSERVACION:</div>
                    <div className="flex-1 text-center font-bold uppercase text-sm leading-tight">
                        {payment.concept.toUpperCase()}
                    </div>
                </div>
                <p className="text-[9px] text-center text-gray-500 mt-2">
                    El señalamiento del mes y año del canon de arrendamiento aquí recibido, esta sujeto a verificacion y auditoria
                </p>
            </div>

            {/* Details Grid */}
            <div className="bg-gray-50/80 p-4 mb-6 text-xs border-t border-b border-gray-200">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-y-2 gap-x-6 items-center">
                    <div className="font-bold uppercase text-gray-600">FECHA DEL DEPOSITO:</div>
                    <div className="text-right font-mono text-sm">{payment.date.split(' ')[0]}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">BANCO ORIGEN:</div>
                    <div className="text-right font-mono uppercase">{payment.bankOrigin || "BANESCO"}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">por Bs.</div>
                    <div className="text-right font-mono font-bold">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>

                    {/* Row 2 */}
                    <div className="font-bold uppercase text-gray-600">MONTO EN DIVISA:</div>
                    <div className="text-right font-mono">{amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">TASA:</div>
                    <div className="text-right font-mono">{rate.toFixed(2)}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">por Bs.</div>
                    <div className="text-right font-mono">{(amountUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>

                    {/* Row 3 */}
                    <div className="font-bold uppercase text-gray-600">REFERENCIA:</div>
                    <div className="text-right font-mono">{payment.reference || "N/A"}</div>

                    <div className="col-span-2 text-right font-bold uppercase text-gray-600">TOTAL -{'>'}</div>
                    <div className="text-right font-bold font-mono text-sm border-t border-black pt-1">
                        {((amountUsd * rate) + amountBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 mt-4 pt-2 border-t border-gray-200 items-center">
                    <div className="font-bold uppercase text-gray-600">Caracas,</div>
                    <div className="font-mono">{new Date().toLocaleDateString('es-VE')}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">BANCO DESTINO:</div>
                    <div className="uppercase font-mono">{payment.bankDest || "MERCANTIL"}</div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-between items-end text-xs mx-8">
                <div className="flex flex-col gap-8 w-full">
                    <div className="flex justify-center mb-8 gap-4 font-mono font-bold text-sm">
                        <span>MONTO EQUIVALENTE EN DIVISA:</span>
                        <span>{((amountBs / rate) + amountUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>

                    <div className="flex justify-between w-full gap-24">
                        <div className="text-center w-1/2 border-t border-black pt-2 uppercase text-gray-500 text-[10px]">
                            firma del consignante
                        </div>
                        <div className="text-center w-1/2 border-t border-black pt-2 uppercase text-gray-500 text-[10px]">
                            firma de recibido
                        </div>
                    </div>
                </div>
            </div>


            {/* QR Code */}
            <div className="absolute bottom-8 right-8 opacity-50">
                <div className="w-16 h-16 bg-white p-1">
                    <QRCode
                        value={payment.id || payment.reference || 'N/A'}
                        size={64}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                </div>
                <p className="text-[8px] text-center mt-1 text-gray-400">{payment.id?.substring(0, 8)}</p>
            </div>
        </div >
    )
})

PaymentReceipt.displayName = "PaymentReceipt"
