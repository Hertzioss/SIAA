import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Signup() {
    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Registro</CardTitle>
                    <CardDescription>
                        El registro de nuevos usuarios es gestionado por los administradores del sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="text-sm text-muted-foreground text-center">
                            Si es un inquilino o propietario, por favor contacte a la administración para obtener sus credenciales.
                        </div>
                        <Button asChild className="w-full">
                            <Link href="/signin">
                                Volver al Inicio de Sesión
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
