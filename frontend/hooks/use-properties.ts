import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Property, PropertyType } from '@/types/property';
import { toast } from 'sonner';

export function useProperties() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPropertyTypes = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('property_types')
                .select('*');
            if (error) throw error;
            setPropertyTypes(data || []);
        } catch (err) {
            console.error('Error fetching property types:', err);
        }
    }, []);

    const fetchProperties = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('properties')
                .select(`
                  *,
                  property_type:property_types(*),
                  units(
                    *,
                    contracts(status)
                  ),
                  property_owners(
                    percentage,
                    owner:owners(id, name)
                  )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to flat structure expected by UI
            const formattedProperties: Property[] = (data || []).map((p: any) => ({
                ...p,
                units: p.units?.map((u: any) => ({
                    ...u,
                    isOccupied: u.contracts?.some((c: any) => c.status === 'active')
                })),
                owners: p.property_owners?.map((po: any) => ({
                    owner_id: po.owner?.id,
                    name: po.owner?.name,
                    participation_percentage: po.percentage
                })) || []
            }));

            setProperties(formattedProperties);
        } catch (err: any) {
            console.error('Error fetching properties:', err);
            setError(err.message);
            toast.error('Error al cargar propiedades');
        } finally {
            setLoading(false);
        }
    }, []);

    const createProperty = async (propertyData: any) => {
        try {
            // Extract owners from propertyData
            const { owners, ...coreData } = propertyData;

            // 1. Create Property
            const { data: newProperty, error } = await supabase
                .from('properties')
                .insert(coreData)
                .select()
                .single();

            if (error) throw error;

            // 2. Assign Owners if any
            if (owners && owners.length > 0) {
                const ownersToInsert = owners.map((o: any) => ({
                    property_id: newProperty.id,
                    owner_id: o.owner_id,
                    percentage: o.participation_percentage
                }));

                const { error: ownersError } = await supabase
                    .from('property_owners')
                    .insert(ownersToInsert);

                if (ownersError) throw ownersError;
            }

            toast.success('Propiedad creada exitosamente');
            fetchProperties();
            return newProperty;
        } catch (err: any) {
            console.error('Error creating property:', err);
            toast.error(`Error al crear propiedad: ${err.message}`);
            throw err;
        }
    };

    const updateProperty = async (id: string, propertyData: any) => {
        try {
            const { owners, ...coreData } = propertyData;

            // 1. Update Core Data
            const { error } = await supabase
                .from('properties')
                .update(coreData)
                .eq('id', id);

            if (error) throw error;

            // 2. Update Owners (Replace strategy)
            if (owners !== undefined) {
                // Delete existing
                const { error: delError } = await supabase
                    .from('property_owners')
                    .delete()
                    .eq('property_id', id);

                if (delError) throw delError;

                // Insert new
                if (owners.length > 0) {
                    const ownersToInsert = owners.map((o: any) => ({
                        property_id: id,
                        owner_id: o.owner_id,
                        percentage: o.participation_percentage
                    }));

                    const { error: insError } = await supabase
                        .from('property_owners')
                        .insert(ownersToInsert);

                    if (insError) throw insError;
                }
            }

            toast.success('Propiedad actualizada exitosamente');
            fetchProperties();
        } catch (err: any) {
            console.error('Error updating property:', err);
            toast.error(`Error al actualizar propiedad: ${err.message}`);
            throw err;
        }
    };

    const deleteProperty = async (id: string) => {
        try {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Propiedad eliminada');
            setProperties(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            console.error('Error deleting property:', err);
            toast.error('Error al eliminar propiedad');
            throw err;
        }
    };

    // Unit Management
    const createUnit = async (unitData: any) => {
        try {
            const { error } = await supabase
                .from('units')
                .insert(unitData);

            if (error) throw error;

            toast.success('Unidad creada exitosamente');
            fetchProperties(); // Refresh to show new unit
        } catch (err: any) {
            console.error('Error creating unit:', err);
            toast.error(`Error al crear unidad: ${err.message}`);
            throw err;
        }
    };

    const updateUnit = async (id: string, unitData: any) => {
        try {
            const { error } = await supabase
                .from('units')
                .update(unitData)
                .eq('id', id);

            if (error) throw error;

            toast.success('Unidad actualizada exitosamente');
            fetchProperties();
        } catch (err: any) {
            console.error('Error updating unit:', err);
            toast.error(`Error al actualizar unidad: ${err.message}`);
            throw err;
        }
    };

    const deleteUnit = async (id: string) => {
        try {
            const { error } = await supabase
                .from('units')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Unidad eliminada');
            fetchProperties();
        } catch (err: any) {
            console.error('Error deleting unit:', err);
            toast.error('Error al eliminar unidad');
            throw err;
        }
    };

    useEffect(() => {
        fetchPropertyTypes();
        fetchProperties();
    }, [fetchProperties, fetchPropertyTypes]);

    return {
        properties,
        propertyTypes,
        loading,
        error,
        fetchProperties,
        createProperty,
        updateProperty,
        deleteProperty,
        createUnit,
        updateUnit,
        deleteUnit
    };
}
