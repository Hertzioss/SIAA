import { useState, useEffect, useCallback } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '@/actions/users'
import { toast } from 'sonner'

export type User = {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'operator' | 'tenant' | 'owner'
    created_at: string
    last_sign_in_at?: string
}

export function useUsers() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        const res = await getUsers()
        if (res.success && res.data) {
            setUsers(res.data as User[])
        } else {
            toast.error('Error cargando usuarios')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const addUser = async (data: { email: string; fullName: string; role: 'admin' | 'operator' | 'tenant', password?: string, tenantId?: string }) => {
        const res = await createUser(data)
        if (res.success) {
            toast.success('Usuario creado correctamente', { description: `Se ha enviado una invitación a ${data.email}` })
            fetchUsers()
            return true
        } else {
            if (res.error?.includes('unique') || res.error?.includes('already registered')) {
                 toast.error('Correo Duplicado', { description: 'El correo electrónico ya está registrado en el sistema.' })
            } else {
                 toast.error(res.error || 'Error creando usuario', { description: 'Verifique los datos e intente nuevamente.' })
            }
            return false
        }
    }

    const updateUserAction = async (userId: string, data: { role: 'admin' | 'operator' | 'tenant', password?: string }) => {
        const res = await updateUser(userId, data)
        if (res.success) {
            toast.success('Usuario actualizado', { description: 'Los permisos y datos han sido modificados.' })
            fetchUsers()
            return true
        } else {
            toast.error(res.error || 'Error actualizando usuario')
            return false
        }
    }

    const removeUser = async (userId: string) => {
        const res = await deleteUser(userId)
        if (res.success) {
            toast.success('Usuario eliminado', { description: 'El acceso ha sido revocado permanentemente.' })
            fetchUsers()
            return true
        } else {
            toast.error(res.error || 'Error eliminando usuario')
            return false
        }
    }

    return {
        users,
        loading,
        addUser,
        updateUser: updateUserAction,
        removeUser,
        refreshUsers: fetchUsers
    }
}
