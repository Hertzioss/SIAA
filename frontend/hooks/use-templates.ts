import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface NotificationTemplate {
    id: string
    name: string
    title: string
    message: string
    type: 'info' | 'alert' | 'payment' | 'contract'
    created_at?: string
}

export function useTemplates() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTemplates = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setTemplates(data || [])
        } catch (err: any) {
            console.error('Error fetching templates:', err)
            // toast.error('Error al cargar plantillas')
        } finally {
            setLoading(false)
        }
    }, [])

    const createTemplate = async (template: Omit<NotificationTemplate, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .insert(template)
                .select()
                .single()

            if (error) throw error

            setTemplates(prev => [data, ...prev])
            return data
        } catch (err: any) {
            console.error('Error creating template:', err)
            throw err
        }
    }

    const updateTemplate = async (id: string, updates: Partial<NotificationTemplate>) => {
        try {
            const { error } = await supabase
                .from('notification_templates')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
        } catch (err: any) {
            console.error('Error updating template:', err)
            throw err
        }
    }

    const deleteTemplate = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notification_templates')
                .delete()
                .eq('id', id)

            if (error) throw error

            setTemplates(prev => prev.filter(t => t.id !== id))
        } catch (err: any) {
            console.error('Error deleting template:', err)
            throw err
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [fetchTemplates])

    return {
        templates,
        loading,
        fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate
    }
}
