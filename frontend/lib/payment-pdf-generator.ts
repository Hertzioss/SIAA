import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFReceiptData {
    payment: {
        date: string
        amount: number
        id?: string
        concept: string
        status: string
        reference?: string
        rate?: number
        amountBs?: number
        amountUsd?: number
        currency?: string
    }
    tenant: {
        name: string
        docId: string
        property: string
        propertyType?: string
    }
    company?: {
        name?: string
        rif?: string
        phone?: string
        email?: string
    }
    owners?: {
        name: string
        docId: string
    }[]
}

export const generatePaymentReceiptPDF = (data: PDFReceiptData): string => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter'
    });

    const { payment, tenant, company, owners } = data;

    const rate = payment.rate || 1;
    let amountUsd = payment.currency === 'USD' ? payment.amount : 0;
    let amountBs = payment.currency === 'VES' ? payment.amount : (payment.currency === 'USD' && payment.rate ? payment.amount * payment.rate : 0);

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(company?.name || "Escritorio Legal", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`RIF: ${company?.rif || "J-12345678-9"}`, 14, 26);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COMPROBANTE DE PAGO", 105, 35, { align: "center" });
    doc.text("POR CANON DE ARRENDAMIENTO", 105, 42, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Recibo Nro: ${payment.id?.substring(0, 8) || 'N/A'}`, 140, 20);
    doc.text(`Fecha: ${payment.date.split(' ')[0]}`, 140, 26);

    // Body Lines
    let startY = 55;

    autoTable(doc, {
        startY,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
        body: [
            ['Nombre del Consignante:', tenant.name],
            ['Cédula / RIF:', tenant.docId],
            ['Inmueble / Unidad:', `${tenant.propertyType?.toUpperCase() || 'LOCAL'} - ${tenant.property}`],
            ['Propietario(s):', owners?.map(o => `${o.name} (${o.docId})`).join(' / ') || 'N/A'],
            ['Concepto / Observación:', payment.concept.toUpperCase() || 'PAGO DE CANON'],
            ['Referencia:', payment.reference || 'N/A'],
        ],
    });

    // Amounts
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    autoTable(doc, {
        startY: finalY,
        theme: 'grid',
        head: [['Detalle de Montos', 'Valores']],
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
        body: [
            ['Monto en Divisas (USD):', `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
            ['Tasa de Cambio:', `Bs. ${rate.toFixed(2)}`],
            ['Monto en Bolívares (VES):', `Bs. ${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],
            ['Total pagado Bs.:', `Bs. ${(amountBs + (amountUsd * rate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],
        ],
    });

    // Footer
    const footerY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.text("___________________________", 50, footerY, { align: "center" });
    doc.text("Firma del Consignante", 50, footerY + 5, { align: "center" });

    doc.text("___________________________", 160, footerY, { align: "center" });
    doc.text("Firma de Recibido", 160, footerY + 5, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("El señalamiento del mes y año del canon de arrendamiento aquí recibido, esta sujeto a verificacion y auditoria", 105, footerY + 20, { align: "center" });

    doc.text(`Generado por: ${company?.name || 'Escritorio Legal'} | Telf: ${company?.phone || ''} | Correo: ${company?.email || ''} | www.escritorio.legal`, 105, footerY + 25, { align: "center" });

    // Output Base64 string for email attachment
    const pdfBase64 = doc.output('datauristring');
    return pdfBase64; // data:application/pdf;filename=generated.pdf;base64,.....
}
