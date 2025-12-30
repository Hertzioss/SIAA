import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type MaintenanceRequest = {
    id: string;
    property_id: string;
    unit_id?: string | null;
    tenant_id?: string | null;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at?: string;
    resolved_at?: string | null;
    unit?: { name: string } | null;
    tenant?: { name: string } | null;
};

export function useMaintenance(propertyId?: string) {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

    const fetchRequests = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_requests')
                .select('*, unit:units(name), tenant:tenants(name)')
                .eq('property_id', propertyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching maintenance requests:', error);
            toast.error('Error al cargar mantenimiento');
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    const createRequest = async (request: Omit<MaintenanceRequest, 'id'>) => {
        try {
            const { error } = await supabase
                .from('maintenance_requests')
                .insert([request]);

            if (error) throw error;
            toast.success('Solicitud creada exitosamente');
            await fetchRequests();
        } catch (error) {
            console.error('Error creating maintenance request:', error);
            toast.error('Error al crear solicitud');
            throw error;
        }
    };

    const updateRequestStatus = async (id: string, status: string) => {
        try {
            const updates: any = { status };
            if (status === 'resolved') {
                updates.resolved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('maintenance_requests')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast.success('Estado actualizado');
            await fetchRequests();
        } catch (error) {
            console.error('Error updating request:', error);
            toast.error('Error al actualizar estado');
            throw error;
        }
    };

    const deleteRequest = async (id: string) => {
        try {
            const { error } = await supabase
                .from('maintenance_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Solicitud eliminada');
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting request:', error);
            toast.error('Error al eliminar solicitud');
            throw error;
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return {
        loading,
        requests,
        fetchRequests,
        createRequest,
        updateRequestStatus,
        deleteRequest
    };
}
