'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
    const router = useRouter()

    useEffect(() => {
        // Clear any client-side auth state here if necessary
        // localStorage.removeItem('token')
        // sessionStorage.clear()

        // Redirect to signin page
        router.push("/")
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
