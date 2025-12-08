import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    user_id: string | null;
    tenant_id: string | null;
    type: 'payment' | 'alert' | 'info' | 'contract';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchNotifications = useCallback(async (currPage?: number, currSize?: number) => {
        setLoading(true);
        const targetPage = currPage || page;
        const targetSize = currSize || pageSize;

        try {
            const from = (targetPage - 1) * targetSize;
            const to = from + targetSize - 1;

            const { data, count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setNotifications(data || []);
            setTotalCount(count || 0);

            // Unread count (separate query might be better if pagination limits fetch, but for now this count logic is weak if not fetching all)
            // Let's do a separate fast query for total unread count
            const { count: unread } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('is_read', false);

            setUnreadCount(unread || 0);

        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            // Silent error mostly, maybe toast only on manual refresh
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    /* ... keep markAsRead, markAllAsRead, createNotification ... */
    // Note: I will need to replace the entire hook body to properly scope markAsRead etc within the new structure if I don't use multi_replace.
    // Given the request is simple replacement, I'll return the full hook implementation to avoid context loss.
    // Optimization: I'll actually only replace the fetch logic and return statement to avoid pasting everything.
    // Wait, replace_file_content must match exactly.
    // I should rewrite fetchNotifications and return block.

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            console.error('Error marking as read:', err);
            toast.error('Error al actualizar notificación');
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success('Todas las notificaciones marcadas como leídas');
        } catch (err: any) {
            console.error('Error marking all as read:', err);
            toast.error('Error al actualizar notificaciones');
        }
    };

    const createNotification = async (data: {
        title: string;
        message: string;
        type: 'info' | 'alert' | 'payment' | 'contract';
        target: { type: 'all' | 'property' | 'tenant'; id?: string }
    }) => {
        try {
            let notificationsToInsert: any[] = [];
            const { title, message, type, target } = data;
            const baseNotification = { title, message, type, user_id: null };

            let recipientsData: { email: string, name: string }[] = [];

            if (target.type === 'tenant') {
                if (!target.id) throw new Error("Tenant ID required for single tenant notification");

                // Fetch email, name, and user_id
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('id, email, name, user_id')
                    .eq('id', target.id)
                    .single();

                if (!tenant) throw new Error("Tenant not found");

                notificationsToInsert.push({
                    ...baseNotification,
                    tenant_id: tenant.id,
                    user_id: tenant.user_id || null
                });

                if (tenant.email) recipientsData.push({ email: tenant.email, name: tenant.name });
            }
            else if (target.type === 'property') {
                if (!target.id) throw new Error("Property ID required for property notification");

                // Fetch active contracts with tenant emails
                const { data: contracts, error: fetchError } = await supabase
                    .from('contracts')
                    .select('tenant_id, tenant:tenants(id, email, name, user_id), unit:units!inner(property_id)')
                    .eq('unit.property_id', target.id)
                    .eq('status', 'active');

                if (fetchError) throw fetchError;

                if (!contracts || contracts.length === 0) {
                    toast.warning("No hay inquilinos activos en esta propiedad");
                    return;
                }

                // Create unique set of tenants and emails
                const uniqueContracts = Array.from(new Map(contracts.map(c => [c.tenant_id, c])).values());

                notificationsToInsert = uniqueContracts.map(c => {
                    const t = c.tenant as any;
                    return {
                        ...baseNotification,
                        tenant_id: c.tenant_id,
                        user_id: t?.user_id || null
                    };
                });

                recipientsData = uniqueContracts.map(c => {
                    const t = c.tenant as any;
                    return t?.email ? { email: t.email, name: t.name } : null;
                }).filter(Boolean) as any[];
            }
            else if (target.type === 'all') {
                const { data: tenants, error: fetchError } = await supabase
                    .from('tenants')
                    .select('id, email, name, user_id')
                    .eq('status', 'solvent');

                if (fetchError) throw fetchError;
                if (!tenants || tenants.length === 0) {
                    toast.warning("No hay inquilinos registrados");
                    return;
                }

                notificationsToInsert = tenants.map(t => {
                    const n: any = { ...baseNotification, tenant_id: t.id };
                    if (t.user_id) n.user_id = t.user_id;
                    return n;
                });
                recipientsData = tenants.map(t => t.email ? { email: t.email, name: t.name } : null).filter(Boolean) as any[];
            }

            if (notificationsToInsert.length === 0) return;

            // 1. Insert into DB (Internal Notification)
            const { error } = await supabase
                .from('notifications')
                .insert(notificationsToInsert);

            if (error) {
                console.error("Supabase Insert Error (JSON):", JSON.stringify(error, null, 2));
                console.error("Supabase Insert Error (Message):", error.message);
                console.error("Supabase Insert Error (Details):", error.details);
                console.error("Supabase Insert Error (Hint):", error.hint);
                throw error;
            }

            // 2. Send Email (Async)
            if (recipientsData.length > 0) {
                try {
                    await fetch('/api/emails/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipients: recipientsData,
                            subject: title,
                            message: message // Sending raw message, API handles HTML template
                        })
                    });
                    toast.success(`Comunicado enviado a ${notificationsToInsert.length} destinatarios`);
                } catch (emailErr) {
                    console.error("Failed to send emails:", emailErr);
                    toast.warning("Notificación guardada, pero hubo un error enviando los correos.");
                }
            } else {
                toast.success(`Comunicado guardado (Sin destinatarios de correo válidos)`);
            }

            fetchNotifications();
        } catch (err: any) {
            console.error('Error creating notification (Message):', err.message);
            console.error('Error creating notification (Stack):', err.stack);
            console.error('Error creating notification (Full):', err);
            toast.error(`Error al enviar comunicado: ${err.message || 'Error desconocido'}`);
            throw err;
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.filter(n => n.id !== id));
            // Recalculate unread isn't needed with the separate count fetch, but nice for optimistic UI if we didn't refetch
            fetchNotifications();
            toast.success('Notificación eliminada');
        } catch (err: any) {
            console.error('Error deleting notification:', err);
            toast.error('Error al eliminar notificación');
        }
    };

    // Realtime subscription with Polling Fallback
    useEffect(() => {
        let pollingInterval: NodeJS.Timeout;

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    // Logic needs update: only add to list if it belongs to current page?
                    // Or just re-fetch. Re-fetch is safer for consistency.
                    // But we want the "toast".
                    const newNotification = payload.new as Notification;
                    toast.info(`Nueva notificación: ${newNotification.title}`);
                    fetchNotifications();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log('Realtime connected');
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('Realtime connection failed. Switching to polling mode.');
                    channel.unsubscribe();
                    pollingInterval = setInterval(fetchNotifications, 30000);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [fetchNotifications]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]); // fetchNotifications depends on page/pageSize

    return {
        notifications,
        loading,
        unreadCount,
        page,
        pageSize,
        totalCount,
        setPage,
        setPageSize,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        createNotification
    };
}
