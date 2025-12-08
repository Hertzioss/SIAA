"use client"

import { useState } from "react"
import { useOwnerAccounts } from "@/hooks/use-owner-accounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash, Plus, Building2, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface OwnerAccountsListProps {
    ownerId: string
    readOnly?: boolean
}

export function OwnerAccountsList({ ownerId, readOnly = false }: OwnerAccountsListProps) {
    const { accounts, loading, createAccount, deleteAccount } = useOwnerAccounts(ownerId)
    const [isCreating, setIsCreating] = useState(false)
    const [newAccount, setNewAccount] = useState({
        bank_name: "",
        account_number: "",
        account_type: "corriente" as "corriente" | "ahorro" | "internacional",
        currency: "VES" as "VES" | "USD",
        notes: "" // Added notes field
    })

    const handleCreate = async () => {
        if (!newAccount.bank_name || !newAccount.account_number) return
        await createAccount(newAccount)
        setIsCreating(false)
        setNewAccount({
            bank_name: "",
            account_number: "",
            account_type: "corriente",
            currency: "VES",
            notes: ""
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cuentas Bancarias</h3>
                {!readOnly && !isCreating && (
                    <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Cuenta
                    </Button>
                )}
            </div>

            {isCreating && (
                <Card>
                    <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Banco</Label>
                                <Input
                                    placeholder="Ej. Banesco, Mercantil"
                                    value={newAccount.bank_name}
                                    onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Número de Cuenta / Email</Label>
                                <Input
                                    placeholder="0134..."
                                    value={newAccount.account_number}
                                    onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={newAccount.account_type}
                                    onValueChange={(val: any) => setNewAccount({ ...newAccount, account_type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="corriente">Corriente</SelectItem>
                                        <SelectItem value="ahorro">Ahorro</SelectItem>
                                        <SelectItem value="internacional">Internacional/Zelle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Moneda</Label>
                                <Select
                                    value={newAccount.currency}
                                    onValueChange={(val: any) => setNewAccount({ ...newAccount, currency: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VES">Bolívares (Bs)</SelectItem>
                                        <SelectItem value="USD">Dólares ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas Adicionales</Label>
                            <Textarea
                                placeholder="Detalles extra, titular, etc."
                                value={newAccount.notes}
                                onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                            <Button onClick={handleCreate}>Guardar</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3">
                {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{acc.bank_name}</p>
                                    <Badge variant="secondary" className="text-[10px] h-5">{acc.currency}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground font-mono">{acc.account_number}</p>
                                <p className="text-xs text-muted-foreground capitalize">{acc.account_type}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="flex flex-col items-end mr-4">
                                <span className="text-xs text-muted-foreground">Balance Confirmado</span>
                                <span className={`text-lg font-bold ${acc.balance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    {acc.currency === 'USD' ? '$' : 'Bs.'} {acc.balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        {!readOnly && (
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteAccount(acc.id)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}

                {accounts.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                        No hay cuentas registradas
                    </div>
                )}
            </div>
        </div>
    )
}
