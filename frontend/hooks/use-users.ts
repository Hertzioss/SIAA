import { useState, useEffect, useCallback } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '@/actions/users'
import { toast } from 'sonner'

export type User = {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'operator' | 'tenant'
    created_at: string
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
            toast.success('Usuario creado correctamente')
            fetchUsers()
            return true
        } else {
            toast.error(res.error || 'Error creando usuario')
            return false
        }
    }

    const updateUserAction = async (userId: string, data: { role: 'admin' | 'operator' | 'tenant', password?: string }) => {
        const res = await updateUser(userId, data)
        if (res.success) {
            toast.success('Usuario actualizado correctamente')
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
            toast.success('Usuario eliminado correctamente')
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
