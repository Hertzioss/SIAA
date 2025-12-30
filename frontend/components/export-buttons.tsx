"use client"

import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

interface ExportButtonsProps {
    data: any[]
    filename?: string
    columns: {
        header: string;
        key: string;
        transform?: (value: any) => any
    }[]
    title?: string
}

// Helper to access nested keys
const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Botones para exportar datos a Excel y PDF.
 * Recibe datos y configuración de columnas para generar reportes descargables.
 */
export function ExportButtons({ data, filename = "export", columns, title = "Reporte" }: ExportButtonsProps) {

    const handleExportExcel = () => {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data.map(item => {
                const row: any = {}
                columns.forEach(col => {
                    let value = getNestedValue(item, col.key);
                    if (col.transform) {
                        value = col.transform(value);
                    }
                    row[col.header] = value;
                })
                return row
            }))
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
            XLSX.writeFile(workbook, `${filename}.xlsx`)
            toast.success("Exportado a Excel exitosamente")
        } catch (error) {
            console.error("Excel export error:", error)
            toast.error("Error al exportar a Excel")
        }
    }

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF()

            // Title
            doc.setFontSize(18)
            doc.text(title, 14, 22)
            doc.setFontSize(11)
            doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 30)

            // Table
            const tableColumn = columns.map(col => col.header)
            const tableRows = data.map(item => {
                return columns.map(col => {
                    let value = getNestedValue(item, col.key);
                    if (col.transform) {
                        value = col.transform(value);
                    }
                    return value;
                })
            })

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
            })

            doc.save(`${filename}.pdf`)
            toast.success("Exportado a PDF exitosamente")
        } catch (error) {
            console.error("PDF export error:", error)
            toast.error("Error al exportar a PDF")
        }
    }



    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
            </Button>
        </div>
    )
}
