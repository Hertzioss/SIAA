"use client"

import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRight } from "lucide-react"

/**
 * Navegación principal del sidebar.
 * Muestra los enlaces a las diferentes secciones administrativas.
 */
export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  return (
    <SidebarGroup>

      <SidebarGroupLabel className="text-sm">Administración de Inmuebles</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* <SidebarMenu> */}
        {/* <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Crear"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Crear</span>
            </SidebarMenuButton>
            {/* <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button> */}
        {/* </SidebarMenuItem> */}
        {/* </SidebarMenu> */}
        <SidebarMenu className="gap-3">
          {items.map((item) => (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon className="!size-7 text-primary" />}
                    <span>{item.title}</span>
                    {item.items && (
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
                {!item.items && (
                  <a href={item.url} className="absolute inset-0" />
                )}
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
