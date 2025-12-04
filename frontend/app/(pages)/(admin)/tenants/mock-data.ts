export const TENANTS_DATA = [
    {
        id: "1",
        name: "Carlos Ruiz",
        docId: "V-15.555.555",
        email: "carlos@email.com",
        phone: "0412-5555555",
        property: "Apto 101 - Res. El Valle",
        contractType: "Residencial (12 Meses)",
        status: "Solvente",
        paymentHistory: [
            { date: "01/11/2024", amount: "$400.00", concept: "Canon Noviembre", status: "Pagado" },
            { date: "01/10/2024", amount: "$400.00", concept: "Canon Octubre", status: "Pagado" },
            { date: "01/09/2024", amount: "$400.00", concept: "Canon Septiembre", status: "Pagado" },
        ],
        callLog: [
            { date: "15/10/2024 10:30 AM", note: "Se confirmó recepción de pago.", user: "Admin" }
        ],
        lastEmail: { type: "Factura", date: "01/11/2024" }
    },
    {
        id: "2",
        name: "Ana Gómez",
        docId: "V-20.111.222",
        email: "ana.gomez@email.com",
        phone: "0424-1112233",
        property: "Local 5 - C.C. Plaza",
        contractType: "Comercial (24 Meses)",
        status: "Moroso",
        paymentHistory: [
            { date: "05/11/2024", amount: "$850.00", concept: "Canon Noviembre", status: "Pendiente" },
            { date: "05/10/2024", amount: "$850.00", concept: "Canon Octubre", status: "Pagado" },
        ],
        callLog: [
            { date: "10/11/2024 09:15 AM", note: "Llamada sin contestar. Se dejó mensaje.", user: "Admin" },
            { date: "08/11/2024 02:00 PM", note: "Prometió pago para el 12/11.", user: "Admin" }
        ],
        lastEmail: { type: "Recordatorio de Pago", date: "06/11/2024" }
    }
]
