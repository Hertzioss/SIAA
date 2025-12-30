import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

/**
 * Página de Política de Privacidad.
 * Detalla cómo se recopila, utiliza y protege la información del usuario.
 */
export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-10 max-w-4xl space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">Política de Privacidad</CardTitle>
                    <p className="text-center text-muted-foreground">Última actualización: 1 de Diciembre, 2025</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold mb-2">1. Información que recopilamos</h2>
                        <p className="text-muted-foreground">
                            Recopilamos información que usted nos proporciona directamente, como cuando crea una cuenta, actualiza su perfil o se comunica con nosotros.
                            Esta información puede incluir su nombre, dirección de correo electrónico, número de teléfono y otros datos de contacto.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">2. Uso de la información</h2>
                        <p className="text-muted-foreground">
                            Utilizamos la información recopilada para:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1 mt-2">
                            <li>Proporcionar, mantener y mejorar nuestros servicios.</li>
                            <li>Procesar transacciones y enviar notificaciones relacionadas.</li>
                            <li>Responder a sus comentarios, preguntas y solicitudes de servicio al cliente.</li>
                            <li>Comunicarnos con usted sobre productos, servicios, ofertas y eventos.</li>
                        </ul>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">3. Protección de datos</h2>
                        <p className="text-muted-foreground">
                            Tomamos medidas razonables para proteger su información personal contra pérdida, robo, uso indebido y acceso no autorizado, divulgación, alteración y destrucción.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">4. Cookies</h2>
                        <p className="text-muted-foreground">
                            Utilizamos cookies y tecnologías similares para rastrear la actividad en nuestro servicio y mantener cierta información.
                            Puede configurar su navegador para rechazar todas las cookies o para indicar cuándo se envía una cookie.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">5. Derechos del usuario</h2>
                        <p className="text-muted-foreground">
                            Usted tiene derecho a acceder, corregir o eliminar su información personal. También puede oponerse al procesamiento de sus datos personales,
                            solicitar la restricción del procesamiento o solicitar la portabilidad de sus datos.
                        </p>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-xl font-semibold mb-2">6. Contacto</h2>
                        <p className="text-muted-foreground">
                            Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos a través de nuestro soporte o envíe un correo a privacy@siaa.com.
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