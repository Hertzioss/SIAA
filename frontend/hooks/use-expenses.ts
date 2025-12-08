import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type Expense = {
    id: string;
    property_id: string;
    unit_id?: string | null;
    category: string;
    description: string;
    amount: number;
    date: string;
    status: 'pending' | 'paid' | 'cancelled';
    receipt_url?: string | null;
    created_at?: string;
    unit?: { name: string } | null;
};

export function useExpenses(propertyId?: string) {
    const [loading, setLoading] = useState(false);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const fetchExpenses = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*, unit:units(name)')
                .eq('property_id', propertyId)
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Error al cargar gastos');
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    const createExpense = async (expense: Omit<Expense, 'id'>) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .insert([expense]);

            if (error) throw error;
            toast.success('Gasto registrado exitosamente');
            await fetchExpenses();
        } catch (error) {
            console.error('Error creating expense:', error);
            toast.error('Error al registrar gasto');
            throw error;
        }
    };

    const updateExpense = async (id: string, updates: Partial<Expense>) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast.success('Gasto actualizado exitosamente');
            await fetchExpenses();
        } catch (error) {
            console.error('Error updating expense:', error);
            toast.error('Error al actualizar gasto');
            throw error;
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Gasto eliminado exitosamente');
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast.error('Error al eliminar gasto');
            throw error;
        }
    };

    return {
        loading,
        expenses,
        fetchExpenses,
        createExpense,
        updateExpense,
        deleteExpense
    };
}
