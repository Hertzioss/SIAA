"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, Users, Home, ArrowRight } from "lucide-react"
import { getOwnerProperties } from "@/actions/owner-dashboard"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface MyProperty {
    id: string
    name: string
    address: string
    property_type: { label: string }
    unitsCount: number
    occupiedCount: number
    ownerPercentage: number
}

export default function MyPropertiesPage() {
    const [properties, setProperties] = useState<MyProperty[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProperties = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                setLoading(false)
                return
            }

            const { data, error } = await getOwnerProperties(session.access_token)

            if (data) {
                setProperties(data as any)
            }
            if (error) {
                console.error(error)
            }
            setLoading(false)
        }

        fetchProperties()
    }, [])

    if (loading) return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mis Propiedades</h1>
                <p className="text-muted-foreground">
                    Listado de inmuebles asociados a su cuenta.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {properties.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/50">
                        <Building className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No tiene propiedades asociadas</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-2">
                            Si cree que esto es un error, por favor contacte a la administración.
                        </p>
                    </div>
                ) : (
                    properties.map(property => (
                        <Card key={property.id} className="overflow-hidden flex flex-col">
                            <CardHeader className="bg-muted/50 pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Building className="h-5 w-5 text-primary" />
                                            {property.name}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-1" title={property.address}>{property.address}</CardDescription>
                                    </div>
                                    <Badge variant="outline">{property.property_type?.label || "Propiedad"}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex-1">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="flex flex-col gap-1 p-3 bg-muted/20 rounded-lg">
                                        <span className="text-xs text-muted-foreground uppercase font-medium">Unidades</span>
                                        <div className="flex items-center gap-2">
                                            <Home className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xl font-bold">{property.unitsCount}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 p-3 bg-muted/20 rounded-lg">
                                        <span className="text-xs text-muted-foreground uppercase font-medium">Ocupación</span>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-emerald-500" />
                                            <span className="text-xl font-bold">{property.occupiedCount}</span>
                                            <span className="text-xs text-muted-foreground">/ {property.unitsCount}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-2 border-t">
                                    <div className="text-xs text-muted-foreground">
                                        Participación: <span className="font-medium">{property.ownerPercentage}%</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="gap-2" asChild>
                                        <Link href={`/owners/my-properties/${property.id}`}>
                                            Ver Detalles <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}