import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const generateContractPDF = (contract: any) => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(22)
    doc.text('Contrato de Arrendamiento', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy')}`, 105, 30, { align: 'center' })

    // Contract Info
    doc.setFontSize(14)
    doc.text('Detalles del Contrato', 14, 45)

    const startDate = contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'
    const endDate = contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: es }) : 'Indefinido'

    autoTable(doc, {
        startY: 50,
        head: [['Concepto', 'Detalle']],
        body: [
            ['ID Referencia', contract.id.slice(0, 8)],
            ['Propiedad', contract.units?.properties?.name || 'N/A'],
            ['Unidad', contract.units?.name || 'N/A'],
            ['Inquilino', contract.tenants?.name || 'N/A'],
            ['Documento Inquilino', contract.tenants?.doc_id || 'N/A'],
            ['Fecha Inicio', startDate],
            ['Fecha Fin', endDate],
            ['Canon Mensual', `$ ${contract.rent_amount}`],
            ['Estado', contract.status === 'active' ? 'Activo' : contract.status],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150
    doc.setFontSize(10)
    doc.text('Este documento es un comprobante generado por el sistema.', 14, finalY + 20)
    doc.text('SIAA - Sistema Integral de Administración de Arrendamientos', 14, finalY + 25)

    // Save
    doc.save(`Contrato_${contract.tenants?.name || 'Inquilino'}_${startDate}.pdf`)
}
