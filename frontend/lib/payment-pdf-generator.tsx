"use client";

import React from 'react';
import { createRoot } from 'react-dom/client';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { PaymentReceipt } from '@/components/payment-receipt';
import { format, isValid } from "date-fns"
import { parseLocalDate } from "@/lib/utils"

/**
 * Generador de Recibos usando DOM-to-Canvas nativo.
 * Se cambió de html2canvas -> html-to-image para dar soporte a Tailwind 4 y variables CSS lch()/lab()/oklch().
 */
export const generatePaymentReceiptPDF = async (data: any): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Crear un div contenedor en vivo
            const d = document.createElement('div');
            
            d.style.position = 'fixed';
            d.style.top = '-9999px';
            d.style.left = '-9999px';
            d.style.width = '8.5in';
            d.style.height = '5.5in';
            d.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            // It is critical to append directly to the body for proper style inheritance and measurement
            document.body.appendChild(d);

            // 2. Renderizar usando concurrencia React
            const root = createRoot(d);
            
            const amountVal = parseFloat(data.payment.amount);
            const isVes = data.payment.currency === 'VES';
            const isUsd = data.payment.currency === 'USD';
            const amountBs = data.payment.amountBs !== undefined ? data.payment.amountBs : (isVes ? amountVal : 0);
            const amountUsd = data.payment.amountUsd !== undefined ? data.payment.amountUsd : (isUsd ? amountVal : 0);

            const firstOwnerDocId = (data.owners && data.owners.length > 0) ? data.owners[0].docId : "";
            const companyRif = data.company?.rif?.trim() ? data.company.rif : firstOwnerDocId;
            const companyName = data.company?.name?.trim() ? data.company.name : "Escritorio Legal";
            
            const formattedDate = data.payment.date && isValid(parseLocalDate(data.payment.date)) 
                ? format(parseLocalDate(data.payment.date), 'dd-MM-yyyy') 
                : (data.payment.date || '-');

            root.render(
                <PaymentReceipt 
                    payment={{
                        date: formattedDate,
                        id: data.payment.id,
                        amount: data.payment.amount.toString(),
                        concept: data.payment.concept,
                        status: data.payment.status,
                        reference: data.payment.reference,
                        rate: data.payment.rate,
                        amountBs: amountBs,
                        amountUsd: amountUsd,
                    }} 
                    tenant={data.tenant} 
                    company={{ ...data.company, rif: companyRif, name: companyName }} 
                    owners={data.owners} 
                    logoSrc={data.logoSrc} 
                    timezone={data.timezone} 
                />
            );
            
            // Wait for DOM
            setTimeout(async () => {
                try {
                    const targetElement = d.firstElementChild as HTMLElement;
                    if (!targetElement) throw new Error("DOM Element wasn't generated");

                    // 3. Tomar screenshot usando html-to-image (Formato JPEG para pesar KBs y no MBs)
                    const dataUrl = await htmlToImage.toJpeg(targetElement, {
                        pixelRatio: 2.5, // Retina pero manejable
                        cacheBust: true, // Para SVGs externos o imagenes
                        backgroundColor: '#ffffff',
                        quality: 0.85 // Compresión JPEG vital para enviar por API REST
                    });

                    // 4. Inyectar imagen en jsPDF (Hoja Carta en Portrait para impresoras caseras)
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'letter' // Carta: ~215.9 x 279.4 mm
                    });

                    // El ancho de la hoja carta coincide exacto con 215.9mm.
                    pdf.addImage(dataUrl, 'JPEG', 0, 0, 215.9, 139.7);
                    
                    // 5. Devolver Base64
                    const base64Pdf = pdf.output('datauristring');
                    
                    // Limpieza
                    root.unmount();
                    document.body.removeChild(d);
                    resolve(base64Pdf);
                } catch(e) {
                    root.unmount();
                    if (document.body.contains(d)) document.body.removeChild(d);
                    reject(e);
                }
            }, 800); // Dar suficiente tiempo a render() y a las tipografías
        } catch(e) {
            reject(e);
        }
    });
}
