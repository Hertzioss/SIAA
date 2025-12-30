"use client"

import * as React from "react"
import {
    IconBuilding,
    IconDashboard,
    IconLogout,
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabase"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { InternalAppLogo } from "./internal-appLogo"

// Owner specific navigation data
const ownerNavData = {
    navMain: [
        {
            title: "Inicio",
            url: "/owners/dashboard",
            icon: IconDashboard,
        },
        {
            title: "Mis Propiedades",
            url: "/owners/my-properties",
            icon: IconBuilding,
        },
    ],
}

/**
 * Barra lateral para la vista de Propietarios.
 * Muestra solo opciones relevantes para el propietario.
 */
export function OwnerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [user, setUser] = React.useState({
        name: "Propietario",
        email: "",
        avatar: ""
    })

    React.useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser({
                    name: user.user_metadata?.full_name || user.user_metadata?.name || "Propietario",
                    email: user.email || "",
                    avatar: user.user_metadata?.avatar || ""
                })
            }
        }
        getUser()
    }, [])

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="/owners/dashboard">
                                <InternalAppLogo />
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={ownerNavData.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
        </Sidebar>
    )
}
