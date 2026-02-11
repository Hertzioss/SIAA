import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OwnerIncome } from '@/types/owner-income';
import { toast } from 'sonner';

export function useOwnerIncomes() {
    const [incomes, setIncomes] = useState<OwnerIncome[]>([]);
    const [loading, setLoading] = useState(true);
    const [owners, setOwners] = useState<any[]>([]);

    const fetchOwners = useCallback(async () => {
        const { data, error } = await supabase
            .from('owners')
            .select('id, name, doc_id')
            .order('name');

        if (error) {
            console.error('Error fetching owners:', error);
        } else {
            setOwners(data || []);
        }
    }, []);

    const fetchIncomes = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('owner_incomes')
                .select(`
                    *,
                    owner:owners(id, name, doc_id),
                    property:properties(id, name)
                `)
                .order('date', { ascending: false });

            if (error) throw error;

            setIncomes(data || []);
        } catch (err: any) {
            console.error('Error fetching owner incomes:', err);
            toast.error('Error al cargar ingresos de propietarios');
        } finally {
            setLoading(false);
        }
    }, []);

    const createIncome = async (incomeData: Omit<OwnerIncome, 'id' | 'created_at' | 'owner' | 'property'>) => {
        try {
            const { data, error } = await supabase
                .from('owner_incomes')
                .insert(incomeData)
                .select()
                .single();

            if (error) throw error;

            toast.success('Ingreso registrado', { description: 'El monto ha sido acreditado al balance del propietario.' });
            fetchIncomes();
            return data;
        } catch (err: any) {
            console.error('Error creating income:', err);
            if (err.code === '23503') {
                 toast.error('Propietario Inválido', { description: 'El propietario seleccionado no existe o fue eliminado.' });
            } else {
                 toast.error(`Error al registrar ingreso: ${err.message || 'Error desconocido'}`);
            }
            throw err;
        }
    };

    const updateIncome = async (id: string, incomeData: Partial<OwnerIncome>) => {
        try {
            const { error } = await supabase
                .from('owner_incomes')
                .update(incomeData)
                .eq('id', id);

            if (error) throw error;

            toast.success('Ingreso actualizado', { description: 'Los cambios han sido guardados.' });
            fetchIncomes();
        } catch (err: any) {
            console.error('Error updating income:', err);
             toast.error(`Error al actualizar ingreso: ${err.message || 'Error desconocido'}`);
            throw err;
        }
    };

    const deleteIncome = async (id: string) => {
        try {
            const { error } = await supabase
                .from('owner_incomes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Ingreso eliminado', { description: 'El registro ha sido removido del historial.' });
            setIncomes(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            console.error('Error deleting income:', err);
            toast.error('Error al eliminar ingreso');
            throw err;
        }
    };

    useEffect(() => {
        fetchOwners();
        fetchIncomes();
    }, [fetchOwners, fetchIncomes]);

    return {
        incomes,
        owners,
        loading,
        fetchIncomes,
        createIncome,
        updateIncome,
        deleteIncome
    };
}
