import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface TenantContact {
    id: string
    tenant_id: string
    name: string
    email?: string
    phone?: string
    relation: 'family' | 'partner' | 'worker' | 'other'
    is_primary: boolean
    created_at?: string
}

export function useTenantContacts(tenantId?: string) {
    const [isLoading, setIsLoading] = useState(false)
    const [contacts, setContacts] = useState<TenantContact[]>([])

    const fetchContacts = useCallback(async () => {
        if (!tenantId) return
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('tenant_contacts')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setContacts(data || [])
        } catch (error) {
            console.error('Error fetching contacts:', error)
            toast.error('Error al cargar contactos')
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    const createContact = async (contact: Omit<TenantContact, 'id' | 'created_at'>) => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('tenant_contacts')
                .insert([contact])

            if (error) throw error
            toast.success('Contacto agregado')
            fetchContacts()
            return true
        } catch (error) {
            console.error('Error creating contact:', error)
            toast.error('Error al agregar contacto')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    const updateContact = async (id: string, updates: Partial<TenantContact>) => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('tenant_contacts')
                .update(updates)
                .eq('id', id)

            if (error) throw error
            toast.success('Contacto actualizado')
            fetchContacts()
            return true
        } catch (error) {
            console.error('Error updating contact:', error)
            toast.error('Error al actualizar contacto')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    const deleteContact = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este contacto?')) return false

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('tenant_contacts')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Contacto eliminado')
            fetchContacts()
            return true
        } catch (error) {
            console.error('Error deleting contact:', error)
            toast.error('Error al eliminar contacto')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    return {
        contacts,
        isLoading,
        fetchContacts,
        createContact,
        updateContact,
        deleteContact
    }
}
