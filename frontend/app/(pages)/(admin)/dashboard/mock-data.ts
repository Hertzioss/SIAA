export const DASHBOARD_DATA = {
    all: {
        id: null,
        stats: {
            revenue: 45250,
            revenueTrend: 12.5,
            occupancy: 85,
            occupancyTrend: 2.1,
            properties: 12,
            propertiesTrend: 1,
            requests: 8,
            requestsTrend: "Atención"
        },
        paymentData: [
            { name: "Cobrado", value: 45250, color: "#22c55e" },
            { name: "Por Cobrar", value: 12500, color: "#eab308" },
            { name: "Atrasado", value: 5400, color: "#ef4444" },
        ],
        arrearsData: [
            { name: "0 Meses", value: 85, count: 45 },
            { name: "1 Mes", value: 10, count: 5 },
            { name: "2 Meses", value: 3, count: 2 },
            { name: "3+ Meses", value: 2, count: 1 },
        ],
        revenueExpensesData: [
            { name: "Ene", ingresos: 40000, gastos: 24000 },
            { name: "Feb", ingresos: 30000, gastos: 13980 },
            { name: "Mar", ingresos: 20000, gastos: 9800 },
            { name: "Abr", ingresos: 27800, gastos: 3908 },
            { name: "May", ingresos: 18900, gastos: 4800 },
            { name: "Jun", ingresos: 23900, gastos: 3800 },
            { name: "Jul", ingresos: 34900, gastos: 4300 },
        ],
        occupancyData: [
            { name: "Ene", value: 80 },
            { name: "Feb", value: 82 },
            { name: "Mar", value: 81 },
            { name: "Abr", value: 83 },
            { name: "May", value: 84 },
            { name: "Jun", value: 85 },
        ],
        leaseExpirations: [
            { tenant: "Abogados & Asoc.", property: "Torre Norte", date: "15/11/2024", days: 12 },
            { tenant: "Local 15", property: "CC El Valle", date: "01/12/2024", days: 28 },
            { tenant: "Consultorio Dental", property: "Torre Norte", date: "10/12/2024", days: 37 },
        ],
        recentActivity: [
            { type: "payment", title: "Pago Recibido", desc: "Inversiones Los Andes pagó $1,200.00", amount: "+$1,200.00", status: "success" },
            { type: "contract", title: "Nuevo Contrato", desc: "Tech Solutions Inc. en Torre Norte", amount: "Nuevo", status: "info" },
            { type: "maintenance", title: "Mantenimiento Reportado", desc: "Filtración en Local PB-01", amount: "Urgente", status: "destructive" },
            { type: "payment", title: "Pago Recibido", desc: "Café Gourmet pagó $850.00", amount: "+$850.00", status: "success" },
        ]
    },
    prop1: {
        id: "1",
        name: "Torre Empresarial Norte",
        stats: {
            revenue: 15400,
            revenueTrend: 5.2,
            occupancy: 92,
            occupancyTrend: 1.5,
            properties: 1,
            propertiesTrend: 0,
            requests: 3,
            requestsTrend: "Normal"
        },
        paymentData: [
            { name: "Cobrado", value: 15400, color: "#22c55e" },
            { name: "Por Cobrar", value: 2100, color: "#eab308" },
            { name: "Atrasado", value: 800, color: "#ef4444" },
        ],
        arrearsData: [
            { name: "0 Meses", value: 90, count: 10 },
            { name: "1 Mes", value: 8, count: 1 },
            { name: "2 Meses", value: 2, count: 0 },
            { name: "3+ Meses", value: 0, count: 0 },
        ],
        revenueExpensesData: [
            { name: "Ene", ingresos: 14000, gastos: 8000 },
            { name: "Feb", ingresos: 13500, gastos: 7500 },
            { name: "Mar", ingresos: 15000, gastos: 6000 },
            { name: "Abr", ingresos: 14800, gastos: 5500 },
            { name: "May", ingresos: 15200, gastos: 5000 },
            { name: "Jun", ingresos: 15400, gastos: 4800 },
            { name: "Jul", ingresos: 15400, gastos: 4500 },
        ],
        occupancyData: [
            { name: "Ene", value: 88 },
            { name: "Feb", value: 89 },
            { name: "Mar", value: 90 },
            { name: "Abr", value: 90 },
            { name: "May", value: 91 },
            { name: "Jun", value: 92 },
        ],
        leaseExpirations: [
            { tenant: "Abogados & Asoc.", property: "Torre Norte", date: "15/11/2024", days: 12 },
            { tenant: "Consultorio Dental", property: "Torre Norte", date: "10/12/2024", days: 37 },
        ],
        recentActivity: [
            { type: "payment", title: "Pago Recibido", desc: "Oficina 2-A pagó $1,800.00", amount: "+$1,800.00", status: "success" },
            { type: "maintenance", title: "Mantenimiento Completado", desc: "Reparación AA Oficina 3-B", amount: "Completado", status: "default" },
        ]
    },
    prop2: {
        id: "2",
        name: "Centro Comercial El Valle",
        stats: {
            revenue: 29850,
            revenueTrend: 15.8,
            occupancy: 78,
            occupancyTrend: 3.5,
            properties: 1,
            propertiesTrend: 0,
            requests: 5,
            requestsTrend: "Alto"
        },
        paymentData: [
            { name: "Cobrado", value: 29850, color: "#22c55e" },
            { name: "Por Cobrar", value: 10400, color: "#eab308" },
            { name: "Atrasado", value: 4600, color: "#ef4444" },
        ],
        arrearsData: [
            { name: "0 Meses", value: 80, count: 35 },
            { name: "1 Mes", value: 12, count: 4 },
            { name: "2 Meses", value: 4, count: 2 },
            { name: "3+ Meses", value: 4, count: 1 },
        ],
        revenueExpensesData: [
            { name: "Ene", ingresos: 26000, gastos: 16000 },
            { name: "Feb", ingresos: 16500, gastos: 6480 },
            { name: "Mar", ingresos: 5000, gastos: 3800 },
            { name: "Abr", ingresos: 13000, gastos: -1592 },
            { name: "May", ingresos: 3700, gastos: -200 },
            { name: "Jun", ingresos: 8500, gastos: -1000 },
            { name: "Jul", ingresos: 19500, gastos: -200 },
        ],
        occupancyData: [
            { name: "Ene", value: 70 },
            { name: "Feb", value: 72 },
            { name: "Mar", value: 72 },
            { name: "Abr", value: 75 },
            { name: "May", value: 76 },
            { name: "Jun", value: 78 },
        ],
        leaseExpirations: [
            { tenant: "Local 15", property: "CC El Valle", date: "01/12/2024", days: 28 },
        ],
        recentActivity: [
            { type: "contract", title: "Renovación", desc: "Local 15 renovó por 1 año", amount: "Renovado", status: "info" },
            { type: "payment", title: "Pago Parcial", desc: "Local 04 abonó $500", amount: "+$500.00", status: "warning" },
        ]
    }
}
