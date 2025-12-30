'use client'

import { supabase } from "@/lib/supabase"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "./mode-togle"
import { Container, Eye, EyeOff } from "lucide-react"
import { AppLogo } from "./appLogo"

/**
 * Formulario de inicio de sesión.
 * Gestiona el input de credenciales, visualización de contraseña y envío al backend.
 */
export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    try {
      const { data: response, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log(response)

      if (error) throw error


      // setLoading(false)
      router.push('/dashboard')
      router.refresh()

    }
    catch (error: any) {
      console.error('Error al iniciar sesión:', error)
      setErrorMsg("Usuario o contraseña incorrectos")
      // setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center gap-6" style={{ width: "100%" }}>
        <AppLogo />
        <ModeToggle />

      </div>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleLogin}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Bienvenido</h1>
                <p className="text-muted-foreground text-balance">
                  Inicia sesión para acceder al sistema.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Correo electrónico | Usuario</FieldLabel>
                <Input
                  id="email"
                  // type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  {/* <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a> */}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
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
                    <span className="sr-only">
                      {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    </span>
                  </Button>
                </div>
              </Field>
              <Field>
                <Button type="submit">Iniciar sesión</Button>
              </Field>
              {errorMsg && <p className="text-red-500">{errorMsg}</p>}
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card"> </FieldSeparator>

              <FieldDescription className="text-center">
                Problemas con tu cuenta? <a href="#">Contacta al administrador</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/log-img-big.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Al continuar, usted acepta nuestros <a href="/policy">Terminos y Condiciones</a>{" "}
        y <a href="/privacy">Política de Privacidad</a>.
      </FieldDescription>
    </div >
  )
}
