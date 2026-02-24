'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Send, Paperclip, Eye, RotateCw, Inbox, CheckCircle, Trash2, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import { useNotifications, Notification } from "@/hooks/use-notifications"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CreateNotificationDialog } from "@/components/notifications/create-notification-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Página de gestión de notificaciones.
 * Muestra el historial de notificaciones del sistema y permite a los administradores
 * marcar como leídas, eliminar y crear nuevas notificaciones (comunicados).
 */
export default function NotificationsPage() {
    const {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        createNotification,
        page,
        setPage,
        pageSize,
        setPageSize,
        totalCount
    } = useNotifications()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const paymentNotifications = notifications.filter(n => n.type === 'payment')
    const otherNotifications = notifications.filter(n => n.type !== 'payment')

    // Helper to format date
    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "dd-MM-yyyy HH:mm a", { locale: es })
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Notificaciones</h1>
                    <p className="text-muted-foreground">
                        Centro de alertas, recordatorios y actividades del sistema.
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Marcar todas leídas
                        </Button>
                    )}
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Mail className="mr-2 h-4 w-4" /> Redactar Comunicado
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" /> Todas
                        {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{unreadCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" /> Pagos (Recibidos)
                    </TabsTrigger>
                    {/* Add more tabs as needed based on types */}
                </TabsList>

                {/* ALL NOTIFICATIONS TAB */}
                <TabsContent value="all" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bandeja de Entrada</CardTitle>
                            <CardDescription>Todas las notificaciones y alertas del sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">Cargando notificaciones...</div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">No tienes notificaciones.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Título</TableHead>
                                            <TableHead>Mensaje</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notifications.map((notification) => (
                                            <TableRow key={notification.id} className={!notification.is_read ? "bg-muted/30" : ""}>
                                                <TableCell className="font-medium">
                                                    {notification.title}
                                                    {!notification.is_read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-600"></span>}
                                                </TableCell>
                                                <TableCell className="whitespace-pre-wrap">
                                                    <span>{notification.message}</span>
                                                    {notification.tenant_email && (
                                                        <span className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                            <Mail className="h-3 w-3 shrink-0" />
                                                            {notification.tenant_email}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatDate(notification.created_at)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={notification.type === 'alert' ? 'destructive' : 'secondary'}>
                                                        {notification.type === 'payment' ? 'Pago' : notification.type === 'alert' ? 'Alerta' : 'Info'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {!notification.is_read && (
                                                            <Button variant="ghost" size="icon" onClick={() => markAsRead(notification.id)} title="Marcar leída">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" onClick={() => deleteNotification(notification.id)} className="text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pagination Controls */}
                    {Math.ceil(totalCount / pageSize) > 1 && (
                        <div className="flex items-center justify-end px-4 py-4 border-t">
                            <div className="flex items-center space-x-2">
                                <p className="text-sm text-muted-foreground mr-2">Filas por página:</p>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                                >
                                    <SelectTrigger className="w-[70px] h-8">
                                        <SelectValue placeholder={pageSize.toString()} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 25, 50, 100].map((size) => (
                                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="w-4"></div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
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
                                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* PAYMENTS SPECIFIC TAB */}
                <TabsContent value="payments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notificaciones de Pagos</CardTitle>
                            <CardDescription>Alertas relacionadas con cobros y pagos recibidos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                            ) : paymentNotifications.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">No hay notificaciones de pago.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Título</TableHead>
                                            <TableHead>Detalle</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paymentNotifications.map((notification) => (
                                            <TableRow key={notification.id}>
                                                <TableCell className="font-medium">{notification.title}</TableCell>
                                                <TableCell>{notification.message}</TableCell>
                                                <TableCell>{formatDate(notification.created_at)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => deleteNotification(notification.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CreateNotificationDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSubmit={createNotification}
            />
        </div>
    )
}
