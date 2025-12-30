import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

/**
 * Página de Términos y Condiciones.
 * Muestra los términos legales de uso del servicio.
 */
export default function PolicyPage() {
    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">Términos y Condiciones</CardTitle>
                    <p className="text-center text-muted-foreground">Última actualización: 1 de Diciembre, 2025</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold mb-2">1. Introducción</h2>
                        <p className="text-muted-foreground">
                            Bienvenido a Escritorio Legal. Al acceder y utilizar nuestro sistema de gestión inmobiliaria, usted acepta cumplir con estos términos y condiciones.
                            Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">2. Uso del Servicio</h2>
                        <p className="text-muted-foreground mb-2">
                            Usted se compromete a utilizar el servicio únicamente para fines legales y de acuerdo con estos Términos.
                            Se prohíbe terminantemente:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                            <li>Utilizar el servicio de cualquier manera que viole las leyes locales o internacionales.</li>
                            <li>Intentar acceder sin autorización a partes del sistema.</li>
                            <li>Utilizar el servicio para transmitir publicidad no solicitada o spam.</li>
                        </ul>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">3. Cuentas de Usuario</h2>
                        <p className="text-muted-foreground">
                            Para acceder a ciertas funciones, deberá registrarse y crear una cuenta. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
                            Escritorio Legal se reserva el derecho de suspender o cancelar cuentas que violen estos términos.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">4. Propiedad Intelectual</h2>
                        <p className="text-muted-foreground">
                            El servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de Escritorio Legal y sus licenciantes.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">5. Privacidad</h2>
                        <p className="text-muted-foreground">
                            Su privacidad es importante para nosotros. Por favor, revise nuestra <Link href="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>,
                            que también rige su uso del servicio.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">6. Limitación de Responsabilidad</h2>
                        <p className="text-muted-foreground">
                            En ningún caso Escritorio Legal, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán responsables de daños indirectos, incidentales, especiales, consecuentes o punitivos,
                            incluyendo, sin limitación, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">7. Contacto</h2>
                        <p className="text-muted-foreground">
                            Si tiene alguna pregunta sobre estos Términos, por favor contáctenos a través de nuestro soporte o envíe un correo a admin@siaa.com.
                        </p>
                    </section>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Link href="/" className="text-primary hover:underline text-center block w-full">Volver al inicio</Link>
                </CardHeader>
            </Card>
        </div>
    )
}