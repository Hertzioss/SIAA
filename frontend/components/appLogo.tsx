

import { Landmark } from "lucide-react"

export function AppLogo() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-xl font-bold leading-none text-foreground tracking-tight">
                    Escritorio Legal
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Sistema Integral
                </span>
            </div>
            <div className="h-8 w-[1px] bg-border" />
            <div className="flex items-center justify-center">
                <Landmark className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
        </div>
    )
}