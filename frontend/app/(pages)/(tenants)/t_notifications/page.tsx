'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, Eye, Inbox, Trash2, Calendar, AlertCircle } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Página de notificaciones para inquilinos.
 * Muestra alertas y comunicados importantes enviados por los administradores.
 */
export default function TenantNotificationsPage() {
    const {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        page,
        setPage,
        pageSize,
        totalCount
    } = useNotifications()

    // Helper to format date
    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "dd-MM-yyyy HH:mm a", { locale: es })
    }

    const renderPagination = () => (
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
            >
                Anterior
            </Button>
            <div className="text-sm text-muted-foreground">
                Página {page} de {Math.ceil(totalCount / pageSize) || 1}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalCount || loading}
            >
                Siguiente
            </Button>
        </div>
    )

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mis Notificaciones</h1>
                    <p className="text-muted-foreground">
                        Historial de alertas y comunicados.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" onClick={markAllAsRead} size="sm">
                        <CheckCircle className="mr-2 h-4 w-4" /> Marcar todas leídas
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" /> Bandeja de Entrada
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Cargando notificaciones...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="flex justify-center mb-4">
                                <Inbox className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                            <p>No tienes notificaciones recientes.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`flex flex-col md:flex-row gap-4 p-4 rounded-lg border ${!notification.is_read ? "bg-muted/50 border-primary/20" : "bg-card"}`}
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold">{notification.title}</h4>
                                            {!notification.is_read && (
                                                <Badge className="h-2 w-2 rounded-full p-0 bg-blue-600" variant="outline" title="No leído" />
                                            )}
                                            <Badge variant={notification.type === 'alert' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                                                {notification.type === 'payment' ? 'Pago' : notification.type === 'alert' ? 'Importante' : 'Info'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-balance text-muted-foreground">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(notification.created_at)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        {!notification.is_read && (
                                            <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)} title="Marcar como leída">
                                                <Eye className="h-4 w-4 mr-2" /> Leer
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {notifications.length > 0 && renderPagination()}
                </CardContent>
            </Card>
        </div>
    )
}
