import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OwnerBankAccount } from '@/types/owner';
import { toast } from 'sonner';

export interface AccountWithBalance extends OwnerBankAccount {
    balance: number;
}

export function useOwnerAccounts(ownerId?: string) {
    const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAccounts = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);
        try {
            // 1. Fetch Accounts
            const { data: accountsData, error: accountsError } = await supabase
                .from('owner_bank_accounts')
                .select('*')
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: false });

            if (accountsError) throw accountsError;

            // 2. Fetch Balances (Sum of approved payments linked to each account)
            // We can do this efficiently with an RPC, but for now client-side aggregation or separate queries.
            // Let's do a loop for simplicity as N accounts is small.
            // Or better: fetch all approved payments for this owner's accounts and aggregate.

            const accountIds = accountsData.map(a => a.id);
            let balancesMap: Record<string, number> = {};

            if (accountIds.length > 0) {
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('payments')
                    .select('amount, owner_bank_account_id')
                    .eq('status', 'approved') // Only confirmed funds
                    .in('owner_bank_account_id', accountIds);

                if (paymentsError) throw paymentsError;

                paymentsData.forEach((p: any) => {
                    balancesMap[p.owner_bank_account_id] = (balancesMap[p.owner_bank_account_id] || 0) + Number(p.amount);
                });
            }

            const formattedAccounts: AccountWithBalance[] = accountsData.map(a => ({
                ...a,
                balance: balancesMap[a.id] || 0
            }));

            setAccounts(formattedAccounts);
        } catch (err: any) {
            console.error('Error fetching accounts:', err);
            toast.error('Error al cargar cuentas bancarias');
        } finally {
            setLoading(false);
        }
    }, [ownerId]);

    const createAccount = async (data: Omit<OwnerBankAccount, 'id' | 'created_at' | 'owner_id'>) => {
        if (!ownerId) return;
        try {
            const { error } = await supabase
                .from('owner_bank_accounts')
                .insert({
                    owner_id: ownerId,
                    ...data
                });

            if (error) throw error;
            toast.success('Cuenta agregada');
            fetchAccounts();
        } catch (err: any) {
            console.error(err);
            toast.error('Error al crear cuenta');
        }
    };

    const deleteAccount = async (id: string) => {
        try {
            const { error } = await supabase
                .from('owner_bank_accounts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Cuenta eliminada');
            fetchAccounts();
        } catch (err: any) {
            console.error(err);
            toast.error('Error al eliminar cuenta');
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts,
        loading,
        createAccount,
        deleteAccount,
        refreshAccounts: fetchAccounts
    };
}
