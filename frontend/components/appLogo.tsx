

import { Landmark } from "lucide-react"

const styles = {
    logo: {
        fontSize: "1.5rem",
    }
}

export function AppLogo() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-5xl font-bold leading-none text-foreground tracking-tight">
                    Escritorio Legal
                </span>
                <span className="text-[16px] text-muted-foreground font-medium uppercase tracking-wider">
                    Sistema Integral
                </span>
            </div>
            <div className="h-8 w-[1px] bg-border" />
            <div className="flex items-center justify-center">
                <Landmark className="h-15 w-15 text-primary" strokeWidth={1.5} />
            </div>
        </div>
    )
}