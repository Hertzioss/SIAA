'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TopBanner } from "@/components/top-banner"
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
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/signin')
            } else {
                const role = session.user.user_metadata.role
                const isSuperAdminEnv = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL === session.user.email

                if (role === 'tenant' && !isSuperAdminEnv) {
                    router.push('/payment-form')
                } else if (role === 'owner' && !isSuperAdminEnv) {
                    router.push('/owners/dashboard')
                } else {
                    setLoading(false)
                }
            }
        }

        checkUser()
    }, [router])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <TopBanner />
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 60)",
                        "--header-height": "calc(var(--spacing) * 12)",
                        "--sidebar-top": "1.5rem",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2">
                            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-5">
                                {children}
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
