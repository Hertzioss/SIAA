import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OwnerExpense } from '@/types/owner-expense';
import { toast } from 'sonner';

export function useOwnerExpenses() {
    const [expenses, setExpenses] = useState<OwnerExpense[]>([]);
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

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('owner_expenses')
                .select(`
                    *,
                    owner:owners(id, name, doc_id),
                    property:properties(id, name)
                `)
                .order('date', { ascending: false });

            if (error) throw error;

            setExpenses(data || []);
        } catch (err: any) {
            console.error('Error fetching owner expenses:', err);
            toast.error('Error al cargar egresos de propietarios');
        } finally {
            setLoading(false);
        }
    }, []);

    const createExpense = async (expenseData: Omit<OwnerExpense, 'id' | 'created_at' | 'owner' | 'property'>) => {
        try {
            const { data, error } = await supabase
                .from('owner_expenses')
                .insert(expenseData)
                .select()
                .single();

            if (error) throw error;

            toast.success('Egreso registrado exitosamente');
            fetchExpenses();
            return data;
        } catch (err: any) {
            console.error('Error creating expense:', err);
            toast.error(`Error al registrar egreso: ${err.message}`);
            throw err;
        }
    };

    const updateExpense = async (id: string, expenseData: Partial<OwnerExpense>) => {
        try {
            const { error } = await supabase
                .from('owner_expenses')
                .update(expenseData)
                .eq('id', id);

            if (error) throw error;

            toast.success('Egreso actualizado exitosamente');
            fetchExpenses();
        } catch (err: any) {
            console.error('Error updating expense:', err);
            toast.error(`Error al actualizar egreso: ${err.message}`);
            throw err;
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            const { error } = await supabase
                .from('owner_expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Egreso eliminado');
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            console.error('Error deleting expense:', err);
            toast.error('Error al eliminar egreso');
            throw err;
        }
    };

    useEffect(() => {
        fetchOwners();
        fetchExpenses();
    }, [fetchOwners, fetchExpenses]);

    return {
        expenses,
        owners,
        loading,
        fetchExpenses,
        createExpense,
        updateExpense,
        deleteExpense
    };
}
