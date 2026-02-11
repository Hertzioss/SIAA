import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/types/expense';
import { toast } from 'sonner';

export function useExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    *,
                    property:properties(id, name),
                    unit:units(id, name)
                `)
                .order('date', { ascending: false });

            if (error) throw error;

            setExpenses(data || []);
        } catch (err: any) {
            console.error('Error fetching expenses:', err);
            setError(err.message);
            toast.error('Error al cargar egresos');
        } finally {
            setLoading(false);
        }
    }, []);

    const createExpense = async (expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'property' | 'unit'>) => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .insert(expenseData)
                .select()
                .single();

            if (error) throw error;

            toast.success('Egreso registrado', { description: 'El gasto ha sido guardado correctamente.' });
            fetchExpenses();
            return data;
        } catch (err: any) {
            console.error('Error creating expense:', err);
             // Check for foreign key violation (23503)
             if (err.code === '23503') {
                 toast.error('Referencia Inválida', { description: 'La propiedad o unidad seleccionada no es válida.' });
             } else {
                 toast.error(`Error al registrar egreso: ${err.message || 'Error desconocido'}`);
             }
            throw err;
        }
    };

    const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .update(expenseData)
                .eq('id', id);

            if (error) throw error;

            toast.success('Egreso actualizado', { description: 'Los cambios han sido guardados.' });
            fetchExpenses();
        } catch (err: any) {
            console.error('Error updating expense:', err);
            toast.error(`Error al actualizar egreso: ${err.message || 'Error desconocido'}`);
            throw err;
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Egreso eliminado', { description: 'El registro ha sido removido permanentemente.' });
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            console.error('Error deleting expense:', err);
            toast.error('Error al eliminar egreso');
            throw err;
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    return {
        expenses,
        loading,
        error,
        fetchExpenses,
        createExpense,
        updateExpense,
        deleteExpense
    };
}
