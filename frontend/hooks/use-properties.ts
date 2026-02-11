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
                    contracts(
                      status,
                      tenant:tenants(name)
                    )
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
                units: p.units?.map((u: any) => {
                    const activeContract = u.contracts?.find((c: any) => c.status === 'active');
                    return {
                        ...u,
                        status: activeContract ? 'occupied' : u.status,
                        isOccupied: !!activeContract,
                        tenantName: activeContract?.tenant?.name
                    };
                }),
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

            toast.success(`Propiedad ${newProperty.name} creada`, {
                description: 'La propiedad ha sido registrada exitosamente.'
            });
            fetchProperties();
            return newProperty;
        } catch (err: any) {
            const errorString = JSON.stringify(err);
            console.error('Error creating property:', errorString);
            
            if (err.code === '23505') {
                console.warn('Duplicate property handled');
                toast.error('Propiedad Duplicada', { description: 'Ya existe una propiedad con este nombre o dirección.' });
            } else {
                toast.error(`Error al crear propiedad: ${err.message || 'Error desconocido'}`);
            }
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

            toast.success('Propiedad actualizada', { description: 'Los cambios han sido guardados correctamente.' });
            fetchProperties();
        } catch (err: any) {
            const errorString = JSON.stringify(err);
            console.error('Error updating property:', errorString);

             if (err.code === '23505') {
                console.warn('Duplicate property handled');
                toast.error('Propiedad Duplicada', { description: 'Ya existe una propiedad con este nombre.' });
            } else {
                 toast.error(`Error al actualizar propiedad: ${err.message || 'Error desconocido'}`);
            }
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

            toast.success('Propiedad eliminada', { description: 'La propiedad y sus registros asociados han sido removidos.' });
            setProperties(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            console.error('Error deleting property:', JSON.stringify(err));
            if (err.code === '23503') {
                toast.error('No se puede eliminar', { description: 'La propiedad tiene unidades o contratos activos.' });
            } else {
                 toast.error('Error al eliminar propiedad');
            }
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
            const errorString = JSON.stringify(err);
            console.error('Error creating unit:', errorString);
             if (err.code === '23505') {
                 console.warn('Duplicate unit handled');
                 toast.error('Unidad Duplicada', { description: 'El número/código de unidad ya existe en esta propiedad.' });
             } else {
                 toast.error(`Error al crear unidad: ${err.message || 'Error desconocido'}`);
             }
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

            toast.success(`Unidad ${unitData.number || ''} actualizada`, { description: 'Los datos de la unidad han sido guardados.' });
            fetchProperties();
        } catch (err: any) {
             const errorString = JSON.stringify(err);
             console.error('Error updating unit:', errorString);
             if (err.code === '23505') {
                 console.warn('Duplicate unit handled');
                 toast.error('Unidad Duplicada', { description: 'El número/código de unidad ya existe en esta propiedad.' });
             } else {
                 toast.error(`Error al actualizar unidad: ${err.message || 'Error desconocido'}`);
             }
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

            toast.success('Unidad eliminada', { description: 'La unidad ha sido removida permanentemente.' });
            fetchProperties();
        } catch (err: any) {
            console.error('Error deleting unit:', JSON.stringify(err));
            // Check for foreign key violation (e.g. existing contracts)
            if (err.code === '23503') {
                toast.error('No se puede eliminar', { description: 'La unidad tiene contratos o registros asociados.' });
            } else {
                toast.error('Error al eliminar unidad');
            }
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
