import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { User } from "@/hooks/use-users"
import { getUnlinkedTenants } from "@/actions/users"

const userSchema = z.object({
    fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    role: z.enum(["admin", "operator", "tenant", "owner"]),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal('')),
    tenantId: z.string().optional(),
})

type UserFormValues = z.infer<typeof userSchema>

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: User
    mode: "create" | "edit"
    onSubmit: (data: UserFormValues) => Promise<void>
}



/**
 * Diálogo para la gestión de usuarios del sistema (Admin, Operador, Inquilino).
 * Permite crear cuentas y vincularlas a inquilinos existentes si aplica.
 */
export function UserDialog({ open, onOpenChange, user, mode, onSubmit }: UserDialogProps) {
    const [unlinkedTenants, setUnlinkedTenants] = useState<{ id: string, name: string, doc_id: string }[]>([])

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            fullName: "",
            email: "",
            role: "operator",
            password: "",
            tenantId: "none" // Use "none" or empty string
        },
    })

    const selectedRole = form.watch("role")

    useEffect(() => {
        if (open && mode === 'create') {
            getUnlinkedTenants().then(res => {
                if (res.success && res.data) {
                    setUnlinkedTenants(res.data)
                }
            })
        }
    }, [open, mode])

    useEffect(() => {
        if (mode === 'edit' && user) {
            form.reset({
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                password: "", // Password not editable/viewable usually
            })
        } else {
            form.reset({
                fullName: "",
                email: "",
                role: "operator",
                password: "",
                tenantId: undefined
            })
        }
    }, [mode, user, form, open])

    const handleSubmit = async (data: UserFormValues) => {
        // Cleaning up tenantId if it is "none"
        if (data.tenantId === "none") {
            data.tenantId = undefined
        }
        await onSubmit(data)
    }

    const { isSubmitting } = form.formState

    // Handler when tenant is selected to auto-fill name
    const handleTenantSelect = (tenantId: string) => {
        form.setValue("tenantId", tenantId)
        const selected = unlinkedTenants.find(t => t.id === tenantId)
        if (selected) {
            form.setValue("fullName", selected.name)
            // We could auto-generate email too if needed: form.setValue("email", ...)
        }
    }

    const isSystemUser = user && ['admin', 'operator'].includes(user.role)
    const canEditRole = mode === 'create' || isSystemUser

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Ingrese los datos para crear un nuevo usuario.'
                            : 'Modifique los datos del usuario.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                        {/* Tenant Selector (Only for new Tenants) */}
                        {mode === 'create' && selectedRole === 'tenant' && (
                            <FormField
                                control={form.control}
                                name="tenantId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vincular con Inquilino Existente (Opcional)</FormLabel>
                                        <Select onValueChange={handleTenantSelect} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione un inquilino (o déjelo vacío)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">-- Ninguno (Crear solo usuario) --</SelectItem>
                                                {unlinkedTenants.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.name} ({t.doc_id})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Juan Pérez" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="juan@ejemplo.com"
                                            type="email"
                                            {...field}
                                            disabled={mode === 'edit'} // Email usually not editable easily in Supabase without complications
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{mode === 'create' ? 'Contraseña' : 'Nueva Contraseña (Opcional)'}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder={mode === 'create' ? "******" : "Dejar en blanco para mantener actual"} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rol</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                        disabled={!canEditRole}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un rol" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="operator">Operador</SelectItem>
                                            {/* {(mode === 'create' || selectedRole === 'tenant') && (
                                                <SelectItem value="tenant">Inquilino</SelectItem>
                                            )}
                                            {selectedRole === 'owner' && (
                                                <SelectItem value="owner">Propietario</SelectItem>
                                            )} */}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'create' ? 'Crear' : 'Guardar Cambios'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
