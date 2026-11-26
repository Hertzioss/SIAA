'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "./mode-togle"
import { ExchangeRateDisplay } from "./exchange-rate-display"
import { usePathname, useRouter } from "next/navigation"
import { Clock, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function getHeaderTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Inicio"
  if (pathname.startsWith("/reports/owners")) return "Reporte de Propietarios"
  if (pathname.startsWith("/reports/tenants")) return "Estado de Cuenta de Inquilinos"
  if (pathname.startsWith("/reports")) return "Reportes"
  if (pathname.startsWith("/owners")) return "Propietarios"
  if (pathname.startsWith("/properties")) return "Inmuebles"
  if (pathname.startsWith("/tenants")) return "Inquilinos"
  if (pathname === "/payments/new") return "Registro de Pago"
  if (pathname.startsWith("/payments")) return "Conciliación de Pagos"
  if (pathname.startsWith("/expenses")) return "Ingresos y Egresos"
  if (pathname.startsWith("/contracts")) return "Contratos"
  if (pathname.startsWith("/notifications")) return "Notificaciones"
  if (pathname.startsWith("/communications")) return "Comunicaciones"
  if (pathname.startsWith("/users")) return "Usuarios"
  if (pathname.startsWith("/account")) return "Configuración"
  return ""
}

/**
 * Encabezado principal del panel administrativo.
 * Muestra el título de la sección actual, accesos operativos (pagos pendientes, tasa BCV), tema y cierre de sesión.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0)

  const title = getHeaderTitle(pathname)

  useEffect(() => {
    let active = true
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!error && active && typeof count === 'number') {
        setPendingPaymentsCount(count)
      }
    }

    fetchPendingCount()
    return () => { active = false }
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium truncate">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {pendingPaymentsCount > 0 && (
            <Link
              href="/payments"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
              title="Ir a conciliación de pagos pendientes"
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {pendingPaymentsCount} {pendingPaymentsCount === 1 ? 'pago por conciliar' : 'pagos por conciliar'}
              </span>
            </Link>
          )}
          <ExchangeRateDisplay />
          <ModeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Cerrar sesión</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  )
}
