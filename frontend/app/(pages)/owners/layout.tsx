'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OwnerSidebar } from "@/components/owner-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

export default function OwnerLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/signin')
                return
            }

            const role = session.user.user_metadata.role

            if (role !== 'owner') {
                // Not an owner, redirect out
                if (role === 'admin' || role === 'operator') {
                    router.push('/dashboard')
                } else if (role === 'tenant') {
                    router.push('/payment-form')
                } else {
                    router.push('/signin')
                }
            } else {
                setLoading(false)
            }
        }

        checkUser()
    }, [router])

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <OwnerSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col p-4 md:p-6">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}