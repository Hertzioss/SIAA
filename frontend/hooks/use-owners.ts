import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Owner, OwnerBeneficiary, OwnerType, Property } from '@/types/owner';
import { toast } from 'sonner';
import { updateOwner as updateOwnerAction } from '@/actions/access';


type DbError = {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
};

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
          logo_url,
          beneficiaries:owner_beneficiaries(*),
            property_owners(
            property:properties(
              id,
              name,
              address
            )
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the data to match our Owner interface which expects 'properties' directly
            type OwnerResponse = Omit<Owner, 'properties'> & {
                property_owners: { property: Property }[]
            };

            const formattedOwners: Owner[] = (data || []).map((item: OwnerResponse) => ({
                ...item,
                properties: item.property_owners?.map((po) => po.property) || []
            }));

            setOwners(formattedOwners);
        } catch (error: unknown) {
            console.error('Error fetching owners:', error);
            // Log full error details for debugging
            if (typeof error === 'object' && error !== null) {
                try {
                    console.error('Error details (JSON):', JSON.stringify(error, null, 2));
                } catch {
                    // Start circular structure or similar
                }
            }
            
            // Safe access to error properties
            const err = error as { message?: string; details?: string; hint?: string; code?: string };
            const errorMessage = err.message || 'Error desconocido';
            const errorDetails = err.details || '';
            const errorHint = err.hint || '';
            
            console.error('Error analysis:', { message: errorMessage, details: errorDetails, hint: errorHint });

            setError(errorMessage);
            toast.error(`Error al cargar propietarios: ${errorMessage}`);
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
                    address: ownerData.address,
                    logo_url: ownerData.logo_url
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
        } catch (error: unknown) {
            const err = error as DbError;
            console.error('Error creating owner:', err);
            toast.error(`Error al crear propietario: ${err.message}`);
            throw err;
        }
    };

    const updateOwner = async (id: string, ownerData: Partial<Omit<Owner, 'id' | 'created_at' | 'properties'>>) => {
        try {
            // Adapt Partial<Owner> to the shape expected by server action (which expects specific optional fields)
            // We can cast or just pass it since the structure matches mostly.
            // However, hook uses Partial, action expects ownerData with known structure.
            // Let's create a clean object for the action.

            const actionData = {
                type: ownerData.type as 'individual' | 'company',
                name: ownerData.name || "", // Updates usually have name, but Partial implies might be missing. 
                // Ideally we shouldn't allow partial updates that miss required fields if we are submitting all.
                // But for now, let's assume the form sends all fields.
                doc_id: ownerData.doc_id || "",
                email: ownerData.email,
                phone: ownerData.phone,
                address: ownerData.address,
                logo_url: ownerData.logo_url,
                beneficiaries: ownerData.beneficiaries?.map(b => ({
                    name: b.name,
                    doc_id: b.doc_id,
                    participation_percentage: b.participation_percentage
                }))
            }

            // Since the action requires name/doc_id/type to be present (defined in args),
            // and updateOwner takes Partial, we might have a type mismatch if we just pass partial.
            // The OwnerDialog passes *all* fields on update, so we are safe safe-casting or using defaults.
            // In a partial update scenario (e.g. just updating email), we'd need to fetch first or change action signature.
            // Given OwnerDialog usage: handleSubmit calls onSubmit with { type, ...formData, beneficiaries }. It sends EVERYTHING.
            // So we are good.

            const result = await updateOwnerAction(id, actionData as Parameters<typeof updateOwnerAction>[1])

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('Propietario actualizado exitosamente');
            fetchOwners();
        } catch (error: unknown) {
            const err = error as DbError;
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
        } catch (error: unknown) {
            const err = error as DbError;
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
