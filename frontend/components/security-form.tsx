'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export function SecurityForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            toast.success("Contraseña actualizada exitosamente")
            setPassword("")
            setConfirmPassword("")
        } catch (error: any) {
            console.error("Error updating password:", error)
            toast.error("Error al actualizar contraseña: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                    <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        disabled={isLoading}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">Toggle password visibility</span>
                    </Button>
                </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    disabled={isLoading}
                />
            </div>

            <Button type="submit" disabled={isLoading || !password}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Contraseña
            </Button>
        </form>
    )
}
