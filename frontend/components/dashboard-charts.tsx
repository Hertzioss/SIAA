"use client"

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    LineChart,
    Line
} from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle } from "lucide-react"

interface DashboardChartsProps {
    paymentData: any[]
    arrearsData: any[]
    revenueExpensesData: any[]
    occupancyData: any[]
    leaseExpirations: any[]
    recentActivity: any[]
}

export function DashboardCharts({
    paymentData,
    arrearsData,
    revenueExpensesData,
    occupancyData,
    leaseExpirations,
    recentActivity
}: DashboardChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Left Column: Financials & Occupancy (4 cols) */}
            <div className="col-span-4 space-y-4">
                {/* Financial Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estado Financiero</CardTitle>
                        <CardDescription>Resumen de cobros, morosidad y flujo de caja.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[250px] mb-6">
                            {/* Pie Chart: Payments */}
                            <div className="flex flex-col items-center justify-center">
                                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Pagos vs Deuda</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {paymentData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => `$${value.toLocaleString()}`}
                                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bar Chart: Arrears */}
                            <div className="flex flex-col items-center justify-center">
                                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Morosidad</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={arrearsData}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" unit="%" hide />
                                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            formatter={(value: number, name: string, props: any) => [`${value}% (${props.payload.count} inq.)`, "Porcentaje"]}
                                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                        />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                            {arrearsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : index === 1 ? '#eab308' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Revenue vs Expenses Chart */}
                        <div className="h-[200px] w-full mt-4">
                            <h4 className="text-sm font-medium mb-4 text-muted-foreground text-center">Ingresos vs Gastos (Últimos 6 meses)</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueExpensesData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Tooltip
                                        formatter={(value: number) => `$${value.toLocaleString()}`}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                    />
                                    <Area type="monotone" dataKey="ingresos" stroke="#22c55e" fillOpacity={1} fill="url(#colorIngresos)" />
                                    <Area type="monotone" dataKey="gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastos)" />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Occupancy History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Ocupación</CardTitle>
                        <CardDescription>Tendencia de ocupación en los últimos 6 meses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={occupancyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip
                                        formatter={(value: number) => `${value}%`}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Alerts & Activity (3 cols) */}
            <div className="col-span-3 space-y-4">
                {/* Lease Expirations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Próximos Vencimientos</CardTitle>
                        <CardDescription>Contratos por vencer en los próximos 60 días.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {leaseExpirations.map((item, index) => (
                                <div className="flex items-start gap-4 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10" key={index}>
                                    <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-sm">{item.tenant}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {item.property} • Vence: {item.date}
                                        </p>
                                        <Badge variant="outline" className="mt-2 text-yellow-600 border-yellow-600">
                                            {item.days} días restantes
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {leaseExpirations.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay vencimientos próximos.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardDescription>Últimos movimientos y alertas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentActivity.map((item, index) => (
                                <div className="flex items-center" key={index}>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{item.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.desc}
                                        </p>
                                    </div>
                                    <div className={`ml-auto font-medium ${item.status === 'success' ? 'text-green-600' :
                                            item.status === 'destructive' ? 'text-red-600' :
                                                item.status === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                                        }`}>
                                        {item.amount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
