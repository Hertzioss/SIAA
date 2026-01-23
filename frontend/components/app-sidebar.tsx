"use client"

import * as React from "react"
import {

  IconBuilding,
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileText,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconHome,
  IconInnerShadowTop,
  IconKey,
  IconListDetails,
  IconMail,
  IconNotification,
  IconPictureInPictureTopFilled,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconUserSquareRounded,
  IconUserX,
  IconBriefcase,
  IconCash,
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabase"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "https://github.com/shadcn.png",
  },
  navMain: [
    {
      title: "Inicio",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Propietarios",
      url: "/owners",
      icon: IconUsers,
    },
    {
      title: "Inmuebles",
      url: "/properties",
      icon: IconBuilding,
    },
    {
      title: "Inquilinos",
      url: "/tenants",
      icon: IconKey,
    },
    {
      title: "Pagos",
      url: "#",
      icon: IconCash,
      isActive: true,
      items: [
        {
          title: "Registro de pago",
          url: "/payments/new",
        },
        {
          title: "Conciliación de Pagos",
          url: "/payments",
        },
      ],
    },
    {
      title: "Reportes",
      url: "/reports",
      icon: IconChartBar,
    },
    {
      title: "Contratos",
      url: "/contracts",
      icon: IconFileText,
    },
  ],
  /**
   * Mock data for cloud/proposal features (Placeholder)
   * Datos simulados para características futuras (Nube/Propuestas)
   */
  navClouds: [
    {
      title: "Captura",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Propuestas Activas",
          url: "#",
        },
        {
          title: "Archivados",
          url: "#",
        },
      ],
    },
    {
      title: "Propuestas",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Activas",
          url: "#",
        },
        {
          title: "Archivadas",
          url: "#",
        },
      ],
    },
    {
      title: "Asistente AI",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Prompts",
          url: "#",
        },
        {
          title: "Historial",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Notificaciones",
      url: "/notifications",
      icon: IconNotification,
    },
    {
      title: "Comunicaciones",
      url: "/communications",
      icon: IconMail,
    },
    {
      title: "Usuarios",
      url: "/users",
      icon: IconUserSquareRounded,
    },
  ],
  /**
   * Mock data for documents (Placeholder)
   * Datos simulados para documentos
   */
  documents: [
    {
      name: "Biblioteca de Datos",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reportes",
      url: "/reports",
      icon: IconReport,
    },
    {
      name: "Asistente Word",
      url: "/word-assistant",
      icon: IconFileWord,
    },
  ],
}

/**
 * Barra lateral principal de la aplicación.
 * Gestiona la navegación principal, secundaria y la información del usuario actual.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState(data.user)

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          name: user.user_metadata?.name || user.email?.split('@')[0] || "Usuario",
          email: user.email || "",
          avatar: user.user_metadata?.avatar || "https://github.com/shadcn.png" // Fallback avatar
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
              <a href="/dashboard">
                <InternalAppLogo />
                {/* <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Escritorio Legal.</span> */}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <hr />
        <NavMain items={data.navMain} />
        {/* <hr /> */}
        {/* <NavDocuments items={data.documents} /> */}
        {/* <hr /> */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
