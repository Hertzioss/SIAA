'use client'

export function TopBanner() {
    return (
        <div className="bg-primary px-4 py-3 text-primary-foreground sm:px-6 lg:px-8 w-full z-50 relative">
            <div className="flex items-center justify-center gap-x-6">
                <p className="text-base font-medium leading-6 text-center">
                    {/* <strong className="font-semibold">Aviso importante</strong> */}
                    <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                        <circle cx={1} cy={1} r={1} />
                    </svg>
                    SISTEMA INTEGRAL DE ADMINISTRACION DE ARRENDAMIENTOS
                    <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                        <circle cx={1} cy={1} r={1} />
                    </svg>
                </p>
            </div>
        </div>
    )
}
