'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CreditCard, History, Bell } from "lucide-react"

/**
 * Layout principal del portal de inquilinos.
 * Gestiona la navegación superior y la verificación de sesión del usuario.
 */
export default function TenantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/signin')
            } else {
                // Optional: Check if role is tenant? 
                // For now, let's just ensure they are logged in.
                setLoading(false)
            }
        }
        checkUser()
    }, [router])

    if (loading) return null // Or a spinner

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold">Portal de Pagos</h1>
                    </div>
                    <nav className="flex items-center gap-2">
                        <Button
                            variant={pathname === "/payment-form" ? "default" : "ghost"}
                            asChild
                            className="gap-2"
                        >
                            <Link href="/payment-form">
                                <CreditCard className="h-4 w-4" />
                                Registrar Pago
                            </Link>
                        </Button>
                        <Button
                            variant={pathname === "/payment-history" ? "default" : "ghost"}
                            asChild
                            className="gap-2"
                        >
                            <Link href="/payment-history">
                                <History className="h-4 w-4" />
                                Ver Histórico
                            </Link>
                        </Button>
                        <Button
                            variant={pathname === "/t_notifications" ? "default" : "ghost"}
                            asChild
                            className="gap-2"
                        >
                            <Link href="/t_notifications">
                                <Bell className="h-4 w-4" />
                                Notificaciones
                            </Link>
                        </Button>
                        <Button
                            variant={pathname === "/logout" ? "default" : "ghost"}
                            asChild
                            className="gap-2"
                        >
                            <Link href="/logout">
                                <History className="h-4 w-4" />
                                Salir
                            </Link>
                        </Button>
                    </nav>
                </div>
            </header>
            <main className="flex-1 container mx-auto py-8 px-4">
                {children}
            </main>
        </div>
    )
}