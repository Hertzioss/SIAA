'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TopBanner } from "@/components/top-banner"
import { SessionTimeoutGuard } from "@/components/session-timeout-guard"
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
                return
            }

            const isSuperAdminEnv = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL === session.user.email
            // Prefer server-trusted app_metadata.role or public.users.role over user_metadata
            let role: string | undefined =
                session.user.app_metadata?.role || session.user.user_metadata?.role

            if (!isSuperAdminEnv && !session.user.app_metadata?.role) {
                const { data: dbUser } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .maybeSingle()
                if (dbUser?.role) role = dbUser.role
            }

            if (isSuperAdminEnv || role === 'admin' || role === 'operator') {
                setLoading(false)
            } else if (role === 'tenant') {
                router.push('/payment-form')
            } else if (role === 'owner') {
                router.push('/owners/dashboard')
            } else {
                router.push('/signin')
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
            <SessionTimeoutGuard timeoutMinutes={30} warningMinutes={2} />
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
