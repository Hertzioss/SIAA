"use client"

import { useState, useEffect } from "react"
import { DollarSign, RefreshCw } from "lucide-react"
import { fetchBcvRate } from "@/services/exchange-rate"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function ExchangeRateDisplay() {
    const [rate, setRate] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    const getRate = async () => {
        setLoading(true)
        const val = await fetchBcvRate()
        if (val) setRate(val)
        setLoading(false)
    }

    useEffect(() => {
        getRate()
    }, [])

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={getRate} className="relative">
                        <DollarSign className="h-[1.2rem] w-[1.2rem]" />
                        {rate && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        )}
                        <span className="sr-only">Tasa del día</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-sm font-medium">
                        Tasa BCV: {loading ? <RefreshCw className="inline h-3 w-3 animate-spin" /> : `Bs ${rate?.toFixed(2)}`}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
