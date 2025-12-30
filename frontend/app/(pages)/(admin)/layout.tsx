'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"


export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkUser = async () => {
            // 1. Preguntamos a Supabase si hay alguien logueado
            const { data: { session } } = await supabase.auth.getSession()

            // 2. Si no hay sesión, lo mandamos fuera
            if (!session) {
                console.log('No hay sesión')
                router.push('/signin')
            } else {
                // 3. Check Role or Super Admin
                const role = session.user.user_metadata.role
                const isSuperAdminEnv = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL === session.user.email

                if (role === 'tenant' && !isSuperAdminEnv) {
                    // Tenants should not be here
                    router.push('/payment-form')
                } else if (role === 'owner' && !isSuperAdminEnv) {
                    // Owners should not be here
                    router.push('/owners/dashboard')
                } else {
                    setLoading(false)
                }
            }
        }

        checkUser()
    }, [router])

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            {children}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
