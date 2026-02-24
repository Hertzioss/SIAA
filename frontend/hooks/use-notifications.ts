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
    tenant_email?: string | null;  // joined from tenants table
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
                .select('*, tenants(email)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Flatten tenant email onto the notification object
            const mapped = (data || []).map((n: any) => ({
                ...n,
                tenant_email: n.tenants?.email ?? null,
                tenants: undefined
            }));

            setNotifications(mapped);
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
        target: { type: 'all' | 'property' | 'tenant'; id?: string };
        recipientType: 'tenant' | 'contacts' | 'both';
    }) => {
        try {
            let notificationsToInsert: any[] = [];
            const { title, message, type, target, recipientType } = data;
            const baseNotification = { title, message, type, user_id: null };

            let recipientsData: { email: string, name: string }[] = [];

            if (target.type === 'tenant') {
                if (!target.id) throw new Error("Tenant ID required for single tenant notification");

                // Fetch email, name, user_id, and contacts if needed
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('id, email, name, user_id, tenant_contacts(email, name)')
                    .eq('id', target.id)
                    .single();

                if (!tenant) throw new Error("Tenant not found");

                notificationsToInsert.push({
                    ...baseNotification,
                    tenant_id: tenant.id,
                    user_id: tenant.user_id || null
                });

                if (recipientType === 'tenant' || recipientType === 'both') {
                    if (tenant.email) recipientsData.push({ email: tenant.email, name: tenant.name });
                }

                if (recipientType === 'contacts' || recipientType === 'both') {
                    const contacts = tenant.tenant_contacts || [];
                    contacts.forEach((c: any) => {
                        if (c.email) recipientsData.push({ email: c.email, name: c.name });
                    });
                }
            }
            else if (target.type === 'property') {
                if (!target.id) throw new Error("Property ID required for property notification");

                // Fetch active contracts with tenant emails and contacts
                // Note: tenant contacts fetching depends on relation structure. 
                // Assuming tenants has many tenant_contacts. contract has one tenant.
                const { data: contracts, error: fetchError } = await supabase
                    .from('contracts')
                    .select('tenant_id, tenant:tenants(id, email, name, user_id, tenant_contacts(email, name)), unit:units!inner(property_id)')
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

                uniqueContracts.forEach(c => {
                    const t = c.tenant as any;
                    if (!t) return;

                    if (recipientType === 'tenant' || recipientType === 'both') {
                        if (t.email) recipientsData.push({ email: t.email, name: t.name });
                    }
                    if (recipientType === 'contacts' || recipientType === 'both') {
                        const contacts = t.tenant_contacts || [];
                        contacts.forEach((contact: any) => {
                            if (contact.email) recipientsData.push({ email: contact.email, name: contact.name });
                        });
                    }
                });
            }
            else if (target.type === 'all') {
                const { data: tenants, error: fetchError } = await supabase
                    .from('tenants')
                    .select('id, email, name, user_id, tenant_contacts(email, name)')
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

                tenants.forEach(t => {
                    if (recipientType === 'tenant' || recipientType === 'both') {
                        if (t.email) recipientsData.push({ email: t.email, name: t.name });
                    }
                    if (recipientType === 'contacts' || recipientType === 'both') {
                        const contacts = t.tenant_contacts || [];
                        contacts.forEach((contact: any) => {
                            if (contact.email) recipientsData.push({ email: contact.email, name: contact.name });
                        });
                    }
                });
            }

            if (notificationsToInsert.length === 0) return;

            // 1. Insert into DB (Internal Notification)
            const { error } = await supabase
                .from('notifications')
                .insert(notificationsToInsert);

            if (error) {
                console.error("Supabase Insert Error (JSON):", JSON.stringify(error, null, 2));
                throw error;
            }

            // 2. Send Email (Async)
            // console.log("Sending emails to:", recipientsData); // Debug log
            if (recipientsData.length > 0) {
                try {
                    await fetch('/api/emails/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipients: recipientsData,
                            subject: title,
                            message: message
                        })
                    });
                    toast.success(`Comunicado enviado a ${notificationsToInsert.length} inquilinos (${recipientsData.length} emails)`);
                } catch (emailErr) {
                    console.error("Failed to send emails:", emailErr);
                    toast.warning("Notificación guardada, pero hubo un error enviando los correos.");
                }
            } else {
                toast.success(`Comunicado guardado (Sin destinatarios de correo válidos)`);
            }

            fetchNotifications();
        } catch (err: any) {
            console.error('Error creating notification:', err);
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
