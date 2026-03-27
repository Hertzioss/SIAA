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
    logoSrc?: string | null
    timezone?: string
}

export const generatePaymentReceiptPDF = (data: PDFReceiptData): string => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter'
    });

    const { payment, tenant, company, owners, logoSrc, timezone } = data;

    const rate = payment.rate || 1;
    let amountUsd = payment.currency === 'USD' ? payment.amount : (payment.currency === 'VES' ? 0 : payment.amount);
    let amountBs = payment.currency === 'VES' ? payment.amount : (payment.currency === 'USD' && payment.rate ? payment.amount * payment.rate : 0);
    const totalBs = (amountUsd * rate) + amountBs;

    // Helper: Draw a field with gray label background
    const drawField = (y: number, label: string, value: string, labelWidth: number = 45) => {
        doc.setFillColor(248, 249, 250); // Very light gray from UI
        doc.rect(15, y, labelWidth, 6, 'F');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(label, 17, y + 4);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(value, 15 + labelWidth + 5, y + 4.5);
        
        // Bottom border for the field
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.1);
        doc.line(15, y + 6, 201, y + 6);
    };

    // Outer Border
    doc.setDrawColor(30, 41, 51);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 196, 130);

    // Header Logo
    if (logoSrc) {
        try {
            doc.addImage(logoSrc, 'JPEG', 15, 15, 30, 15, undefined, 'FAST');
        } catch (e) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(company?.name?.substring(0, 20) || "Administración", 15, 22);
        }
    } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(company?.name?.substring(0, 20) || "Administración", 15, 22);
    }
    
    // Header Title (Center)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    // Header Title (Center)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("COMPROBANTE DE PAGO POR CANON DE ARRENDAMIENTO", 105, 18, { align: "center" });

    // RECIBO POR Section
    let currentY = 40;
    doc.setFillColor(248, 249, 250);
    doc.rect(15, currentY, 186, 14, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO POR:", 17, currentY + 6);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })), 60, currentY + 6);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("BOLIVARES", 85, currentY + 6);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(String(amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'), 60, currentY + 11);
    doc.setFontSize(8);
    doc.text("DOLARES", 85, currentY + 11);
    
    currentY += 14;

    // Fields
    drawField(currentY, "NOMBRE DEL CONSIGNANTE:", (tenant.name || '').toUpperCase());
    currentY += 6;
    drawField(currentY, "CEDULA / RIF :", (tenant.docId || '').toUpperCase());
    currentY += 6;

    // TIPO DE INMUEBLE specialized field
    doc.setFillColor(248, 249, 250);
    doc.rect(15, currentY, 45, 6, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("TIPO DE INMUEBLE:", 17, currentY + 4);
    
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const pType = (tenant.propertyType || "LOCAL").toUpperCase();
    doc.text(pType, 65, currentY + 4);
    
    doc.setFillColor(248, 249, 250);
    doc.rect(85, currentY, 12, 6, 'F');
    doc.setTextColor(100, 116, 139);
    doc.text("NO.", 87, currentY + 4);
    
    doc.setTextColor(30, 41, 59);
    const unitNo = String(tenant.property.split('-')[1]?.trim() || '-');
    doc.text(unitNo, 100, currentY + 4);
    
    doc.setFillColor(248, 249, 250);
    doc.rect(115, currentY, 20, 6, 'F');
    doc.setTextColor(100, 116, 139);
    doc.text("EDIFICIO:", 117, currentY + 4);

    
    doc.setTextColor(30, 41, 59);
    const building = tenant.property.split('-')[0]?.trim() || tenant.property;
    doc.text(building.toUpperCase(), 140, currentY + 4);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(15, currentY + 6, 201, currentY + 6);
    currentY += 6;

    drawField(currentY, "PROPIETARIO(S):", (owners?.map(o => `${o.name} / ${o.docId}`).join(' — ') || 'N/A').toUpperCase());
    currentY += 6;
    
    // OBSERVACION specialized (double line)
    doc.setFillColor(248, 249, 250);
    doc.rect(15, currentY, 45, 10, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("OBSERVACION:", 17, currentY + 4);
    
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const concept = (payment.concept || 'PAGO DE CANON').replace(/RENTA/gi, 'CANON').toUpperCase();
    doc.text(concept, 65, currentY + 4);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("El señalamiento del mes y año del canon de arrendamiento aquí recibido, esta sujeto a verificacion y auditoria", 65, currentY + 8);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(15, currentY + 10, 201, currentY + 10);
    currentY += 12;

    // Detailed Section
    const drawRow = (y: number, label1: string, val1: string, label2: string, val2: string) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(label1, 17, y);
        doc.setTextColor(30, 41, 59);
        doc.text(val1, 65, y);
        
        doc.setTextColor(100, 116, 139);
        doc.text(label2, 110, y);
        doc.setTextColor(30, 41, 59);
        doc.text(val2, 140, y);
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 2, 201, y + 2);
    };

    drawRow(currentY, "FECHA DEL DEPOSITO:", payment.date?.split('T')[0] || '-', "", "");
    currentY += 5;
    drawRow(currentY, "MONTO EN BOLIVARES:", `${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, "REFERENCIA:", (payment.reference || "N/A").toString());
    currentY += 5;
    drawRow(currentY, "MONTO EN DIVISA:", amountUsd > 0 ? amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-', "TASA:", rate.toFixed(2));
    currentY += 8;

    // Subtotal section
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("SUBTOTAL:", 17, currentY);
    currentY += 4;
    
    doc.text("BOLIVARES:", 17, currentY);
    doc.setTextColor(30, 41, 59);
    doc.text(`${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`, 65, currentY);
    currentY += 4;
    
    doc.setTextColor(100, 116, 139);
    doc.text("DIVISAS:", 17, currentY);
    doc.setTextColor(30, 41, 59);
    doc.text(`${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 65, currentY);
    currentY += 4;
    
    doc.setLineWidth(0.2);
    doc.line(15, currentY - 1, 100, currentY - 1);
    
    doc.setTextColor(31, 41, 55);
    doc.text("TOTAL BS.:", 17, currentY + 2);
    doc.text(`${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 65, currentY + 2);

    // Signature Area
    const footerY = 125;
    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.line(30, footerY, 90, footerY);
    doc.line(120, footerY, 180, footerY);
    
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("FIRMA DEL CONSIGNANTE", 60, footerY + 4, { align: "center" });
    doc.text("FIRMA DE RECIBIDO", 150, footerY + 4, { align: "center" });

    // Fine print footer
    const printedAt = new Date().toLocaleString('es-VE', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: timezone || 'America/Caracas' 
    });
    
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Caracas, ${printedAt}`, 15, 135);
    
    doc.setFontSize(7);
    doc.text(`Elaborado por: ${company?.name || 'Escritorio Legal'} | Telf: ${company?.phone || ''} | RIF: ${company?.rif || ''}`, 15, 138);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`www.escritorio.legal | ${company?.email || ''}`, 196, 138, { align: "right" });

    // Output Base64 
    return doc.output('datauristring');
}


