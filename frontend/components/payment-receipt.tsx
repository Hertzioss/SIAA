import React from 'react'

interface PaymentReceiptProps {
    payment: {
        date: string
        amount: string
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
}

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(({ payment, tenant, company }, ref) => {
    // Helper to parse amount string to number if needed
    const parseAmount = (str: string) => parseFloat(str.replace(/[^0-9.-]+/g, ""))

    const amountVal = parseAmount(payment.amount)
    const rate = payment.rate || 65.26 // Mock rate if missing
    const amountBs = payment.amountBs || (amountVal * rate)
    const amountUsd = payment.amountUsd || amountVal

    return (
        <div ref={ref} className="bg-white p-8 max-w-[800px] mx-auto text-black font-sans text-sm border border-gray-300">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="border border-gray-400 p-2 w-1/4 text-center">
                    <p className="text-xs uppercase text-gray-500">sucesión</p>
                    <h2 className="font-bold text-lg uppercase">{company?.name || "INMOBILIARIA SIAA"}</h2>
                    <div className="flex justify-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => <div key={i} className="w-2 h-2 border border-gray-400 rotate-45"></div>)}
                    </div>
                    <p className="text-[10px] mt-1">RIF: {company?.rif || "J-12345678-9"}</p>
                </div>
                <div className="flex-1 text-center pt-2">
                    <p className="text-xs uppercase text-gray-500 mb-1">COPIA DE ADMINISTRACION</p>
                    <h1 className="font-bold text-lg uppercase px-4">RECIBO DE RECEPCION DE DINERO POR CANON DE ARRENDAMIENTO</h1>
                </div>
            </div>

            {/* Amounts */}
            <div className="flex mb-2 bg-gray-100 p-2 items-center">
                <div className="w-32 font-bold uppercase">RECIBO POR:</div>
                <div className="flex-1 flex justify-end gap-12 pr-8">
                    <div className="text-right">
                        <div className="font-bold">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                        <div className="font-bold">{amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="text-left font-bold uppercase">
                        <div>BOLIVARES</div>
                        <div>DOLARES</div>
                    </div>
                </div>
            </div>

            {/* Payer Info */}
            <div className="flex mb-2 items-center border-b border-gray-200 pb-1">
                <div className="w-48 font-bold text-xs uppercase">NOMBRE DEL CONSIGNANTE:</div>
                <div className="flex-1 bg-gray-100 px-2 py-1 font-bold uppercase text-center">{tenant.name}</div>
            </div>

            <div className="flex mb-4 items-center">
                <div className="w-48 font-bold text-xs uppercase">CEDULA DE IDENTIDAD No.:</div>
                <div className="flex-1 px-2">{tenant.docId}</div>
            </div>

            {/* Property Info */}
            <div className="flex mb-4 items-center gap-4 text-xs">
                <div className="font-bold uppercase">TIPO DE INMUEBLE:</div>
                <div className="font-bold uppercase border-b border-gray-300 px-2 min-w-[100px] text-center">LOCAL</div>

                <div className="font-bold uppercase">No.</div>
                <div className="font-bold uppercase bg-gray-200 px-2 py-0.5 min-w-[60px] text-center">{tenant.property.split(' ')[1] || 'PB-1'}</div>

                <div className="font-bold uppercase">EDIFICIO:</div>
                <div className="flex-1 font-bold uppercase bg-gray-100 px-2 py-0.5 text-center">{tenant.property}</div>
            </div>

            {/* Observation */}
            <div className="mb-6">
                <div className="flex items-start gap-2 mb-1">
                    <div className="font-bold text-xs uppercase w-32 pt-1">OBSERVACION:</div>
                    <div className="flex-1 text-center font-bold uppercase text-sm">
                        {payment.concept.toUpperCase()}
                    </div>
                </div>
                <p className="text-[10px] text-center text-gray-500 italic">
                    El señalamiento del mes y año del canon de arrendamiento aquí recibido, esta sujeto a verificacion y auditoria
                </p>
            </div>

            {/* Details Grid */}
            <div className="bg-gray-50 p-4 mb-6 text-xs">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] gap-y-2 gap-x-4 items-center">
                    <div className="font-bold uppercase text-gray-600">FECHA DEL DEPOSITO:</div>
                    <div className="text-right font-mono">{payment.date.split(' ')[0]}</div>

                    <div className="font-bold uppercase text-gray-600">BANCO ORIGEN:</div>
                    <div className="text-right font-mono uppercase">{payment.bankOrigin || "BANESCO"}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">por Bs.</div>
                    <div className="text-right font-mono">{amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>

                    {/* Row 2 */}
                    <div className="font-bold uppercase text-gray-600">MONTO EN DIVISA:</div>
                    <div className="text-right font-mono">{amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>

                    <div className="font-bold uppercase text-gray-600">TASA:</div>
                    <div className="text-right font-bold font-mono">{rate.toFixed(2)}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">por Bs.</div>
                    <div className="text-right font-mono">{(amountUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>

                    {/* Row 3 */}
                    <div className="font-bold uppercase text-gray-600">REFERENCIA:</div>
                    <div className="text-right font-mono">{payment.reference || "12345678"}</div>

                    <div className="col-span-2 text-right font-bold uppercase">TOTAL -{'>'}</div>
                    <div className="text-right font-bold font-mono text-sm border-t border-black">
                        {((amountUsd * rate) + amountBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 mt-2 items-center">
                    <div className="font-bold uppercase text-gray-600">LUGAR:</div>
                    <div className="uppercase">CARACAS, {new Date().toLocaleDateString()}</div>

                    <div className="font-bold uppercase text-gray-600 text-right">BANCO DESTINO:</div>
                    <div className="uppercase">{payment.bankDest || "MERCANTIL"}</div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end mt-12 mb-4 text-xs">
                <div className="text-center w-1/3 border-t border-black pt-2">
                    firma del consignante
                </div>

                <div className="text-center">
                    <div className="flex gap-2 mb-4 justify-center font-mono">
                        <span className="font-bold">MONTO EQUIVALENTE EN DIVISA:</span>
                        <span>{amountUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                    </div>
                </div>

                <div className="text-center w-1/3 border-t border-black pt-2">
                    firma de recibido
                </div>
            </div>
        </div>
    )
})

PaymentReceipt.displayName = "PaymentReceipt"
