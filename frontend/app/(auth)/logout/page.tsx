'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

/**
 * Página de cierre de sesión.
 * Ejecuta el logout de Supabase y redirige al usuario a la página principal.
 */
export default function LogoutPage() {
    const router = useRouter()

    useEffect(() => {

        const doLogout = async () => {
            const { error } = await supabase.auth.signOut()
            if (error) console.log('Error cerrando sesión:', error)
        }
        doLogout()
        router.replace('/')
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Cerrando sesión...</h1>
                <p className="text-muted-foreground">Por favor espere mientras lo redirigimos.</p>
            </div>
        </div>
    )
}
