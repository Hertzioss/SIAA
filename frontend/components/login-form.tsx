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
import { Container } from "lucide-react"
import { AppLogo } from "./appLogo"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center gap-6" style={{ width: "100%" }}>
        <AppLogo />
        <ModeToggle />

      </div>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
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
                <Input id="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">Iniciar sesión</Button>
              </Field>
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
    </div>
  )
}
