import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Owner, OwnerBeneficiary, OwnerType } from '@/types/owner';
import { toast } from 'sonner';

export function useOwners() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOwners = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch owners with beneficiaries and properties joined
            // Note: properties are joined via property_owners.
            // But based on the mock, it seems we just need a list of properties (count or names).
            // Let's simplified fetch for now.

            const { data, error } = await supabase
                .from('owners')
                .select(`
          *,
          beneficiaries:owner_beneficiaries(*),
            property_owners(
            property:properties(
              id,
              name
            )
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the data to match our Owner interface which expects 'properties' directly
            const formattedOwners: Owner[] = (data || []).map((item: any) => ({
                ...item,
                properties: item.property_owners?.map((po: any) => po.property) || []
            }));

            setOwners(formattedOwners);
        } catch (err: any) {
            console.error('Error fetching owners:', err);
            setError(err.message);
            toast.error('Error al cargar propietarios');
        } finally {
            setLoading(false);
        }
    }, []);

    const createOwner = async (ownerData: Omit<Owner, 'id' | 'created_at' | 'properties'>) => {
        try {
            // 1. Insert Owner
            const { data: newOwner, error: ownerError } = await supabase
                .from('owners')
                .insert({
                    type: ownerData.type,
                    name: ownerData.name,
                    doc_id: ownerData.doc_id,
                    email: ownerData.email,
                    phone: ownerData.phone,
                    address: ownerData.address
                })
                .select()
                .single();

            if (ownerError) throw ownerError;

            // 2. Insert Beneficiaries if any
            if (ownerData.beneficiaries && ownerData.beneficiaries.length > 0) {
                const beneficiariesToInsert = ownerData.beneficiaries.map(b => ({
                    owner_id: newOwner.id,
                    name: b.name,
                    doc_id: b.doc_id,
                    participation_percentage: b.participation_percentage
                }));

                const { error: benError } = await supabase
                    .from('owner_beneficiaries')
                    .insert(beneficiariesToInsert);

                if (benError) throw benError;
            }

            toast.success('Propietario creado exitosamente');
            fetchOwners(); // Refresh list
            return newOwner;
        } catch (err: any) {
            console.error('Error creating owner:', err);
            toast.error(`Error al crear propietario: ${err.message}`);
            throw err;
        }
    };

    const updateOwner = async (id: string, ownerData: Partial<Omit<Owner, 'id' | 'created_at' | 'properties'>>) => {
        try {
            // 1. Update Owner fields
            const { error: ownerError } = await supabase
                .from('owners')
                .update({
                    type: ownerData.type,
                    name: ownerData.name,
                    doc_id: ownerData.doc_id,
                    email: ownerData.email,
                    phone: ownerData.phone,
                    address: ownerData.address
                })
                .eq('id', id);

            if (ownerError) throw ownerError;

            // 2. Handle Beneficiaries update (Full replacement strategy for simplicity)
            // This is often easier: delete all existing for this owner, then insert new ones.
            // CAUTION: This changes IDs of beneficiaries. If that matters, we need a diffing strategy.
            // For this app, it likely doesn't matter much unless we link other things to beneficiaries.

            if (ownerData.beneficiaries !== undefined) {
                // Delete existing
                const { error: delError } = await supabase
                    .from('owner_beneficiaries')
                    .delete()
                    .eq('owner_id', id);

                if (delError) throw delError;

                // Insert new
                if (ownerData.beneficiaries.length > 0) {
                    const beneficiariesToInsert = ownerData.beneficiaries.map(b => ({
                        owner_id: id,
                        name: b.name,
                        doc_id: b.doc_id,
                        participation_percentage: b.participation_percentage
                    }));

                    const { error: benError } = await supabase
                        .from('owner_beneficiaries')
                        .insert(beneficiariesToInsert);

                    if (benError) throw benError;
                }
            }

            toast.success('Propietario actualizado exitosamente');
            fetchOwners();
        } catch (err: any) {
            console.error('Error updating owner:', err);
            toast.error(`Error al actualizar: ${err.message}`);
            throw err;
        }
    };

    const deleteOwner = async (id: string) => {
        try {
            const { error } = await supabase
                .from('owners')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Propietario eliminado');
            fetchOwners();
        } catch (err: any) {
            console.error('Error deleting owner:', err);
            toast.error('Error al eliminar propietario');
            throw err;
        }
    };

    useEffect(() => {
        fetchOwners();
    }, [fetchOwners]);

    return {
        owners,
        loading,
        error,
        fetchOwners,
        createOwner,
        updateOwner,
        deleteOwner
    };
}
