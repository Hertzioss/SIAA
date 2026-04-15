import React from 'react'
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Formats
const formatMoneyBs = (val: number) => val.toLocaleString('es-VE', { minimumFractionDigits: 2 })
const formatMoneyUsd = (val: number) => val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'

const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff' },
    container: { border: '2pt solid #000', padding: 15, flex: 1, position: 'relative' },
    innerBorder: { border: '1pt solid #000', position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, zIndex: -1 }, // just to simulate the double border
    qrContainer: { position: 'absolute', top: 15, right: 15, width: 48, height: 48 },
    qrImage: { width: '100%', height: '100%' },
    qrText: { fontSize: 6, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    logoContainer: { width: '20%', alignItems: 'center' },
    logoImage: { width: '100%', height: 40, objectFit: 'contain' },
    companyName: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    companyRif: { fontSize: 8, marginTop: 2 },
    headerTitle: { width: '60%', textAlign: 'center', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', paddingTop: 5, paddingRight: 40 },
    
    receiptBanner: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 8, marginBottom: 10, alignItems: 'center' },
    labelCol: { width: 140, fontSize: 10, fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' },
    amountValuesCol: { width: 100 },
    amountLabelsCol: { flex: 1 },
    amountBs: { fontSize: 15, fontWeight: 'bold' },
    amountUsd: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
    amountLabelBs: { fontSize: 8, fontWeight: 'bold', marginTop: 2 },
    amountLabelUsd: { fontSize: 8, fontWeight: 'bold', color: '#6b7280', marginTop: 6 },

    row: { flexDirection: 'row', borderBottom: '1pt solid #e5e7eb', paddingBottom: 4, marginBottom: 6, alignItems: 'center' },
    rowLabel: { width: 140, fontSize: 8, fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' },
    rowValueBg: { flex: 1, backgroundColor: '#f3f4f6', padding: '4 8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    
    propRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center', fontSize: 9 },
    propValBg: { backgroundColor: '#f3f4f6', padding: '4 8', fontWeight: 'bold' },
    propText: { color: '#4b5563', fontWeight: 'bold', marginHorizontal: 8 },

    grid: { backgroundColor: '#f9fafb', padding: 10, borderTop: '1pt solid #e5e7eb', borderBottom: '1pt solid #e5e7eb', marginBottom: 10 },
    gridRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
    gridLabel: { width: 140, fontSize: 8, fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' },
    gridVal: { width: 80, fontSize: 10, fontWeight: 'bold', fontFamily: 'Courier-Bold' },
    gridLabelSm: { width: 80, fontSize: 8, fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' },
    gridValSm: { flex: 1, fontSize: 10, fontFamily: 'Courier' },
    
    subtotalCont: { marginTop: 6, paddingTop: 6, borderTop: '1pt solid #d1d5db' },
    subtotalLabel: { fontSize: 9, fontWeight: 'bold', color: '#4b5563', marginBottom: 4 },
    totalLabel: { width: 140, fontSize: 10, fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' },
    totalVal: { fontSize: 11, fontWeight: 'bold', fontFamily: 'Courier-Bold' },

    sigRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 40, marginBottom: 10 },
    sigCol: { width: '40%', borderTop: '1pt solid #d1d5db', paddingTop: 4, textAlign: 'center' },
    sigText: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase' },

    footer: { borderTop: '1pt solid #d1d5db', paddingTop: 4, fontSize: 7, color: '#111827' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }
})

export interface PDFReceiptData {
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
        name: string;
        docId: string;
    }[]
    logoSrc?: string | null
    timezone?: string
}

export const PaymentReceiptPDF = ({ payment, tenant, company, owners, logoSrc, timezone }: PDFReceiptData) => {
    // FALLBACKS para EVITAR undefined en <Text> que causan crash de hasOwnProperty
    const rate = payment?.rate || 1;
    const amountUsd = payment?.amountUsd ?? (payment?.currency === 'USD' ? payment?.amount : 0) ?? 0;
    const amountBs = payment?.amountBs ?? (payment?.currency === 'VES' ? payment?.amount : 0) ?? 0;
    const totalBs = (amountUsd * rate) + amountBs;

    const safeId = payment?.id || "";
    const safeRef = payment?.reference || "";
    const qrText = safeId || safeRef || 'N/A';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;

    const safeDate = payment?.date ? String(payment.date).split('T')[0] : "";
    const safeConcept = payment?.concept || "";
    const safeTenantName = tenant?.name || "";
    const safeTenantDoc = tenant?.docId || "";
    const safePropType = tenant?.propertyType || "LOCAL";
    const propertyParts = (tenant?.property || "").split('-');
    const propNumber = propertyParts[1]?.trim() || '-';
    const propBldg = propertyParts[0]?.trim() || tenant?.property || "";

    const safeCompanyName = company?.name || "Escritorio Legal";
    const safeCompanyRif = company?.rif || "J-12345678-9";
    const safeCompanyPhone = company?.phone || "";
    const safeCompanyEmail = company?.email || "";

    return (
        <Document>
            {/* Orientación Landscape para que los elementos respiren como en el diseño UI de 8.5x5.5 */}
            <Page size={[612, 396]} style={styles.page}>
                <View style={styles.container}>
                    {/* QR Code */}
                    <View style={styles.qrContainer}>
                        <Image src={qrUrl} style={styles.qrImage} />
                        <Text style={styles.qrText}>{safeId.substring(0, 8)}</Text>
                    </View>

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.logoContainer}>
                            {Boolean(logoSrc) ? (
                                <Image src={logoSrc!} style={styles.logoImage} />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={styles.companyName}>{safeCompanyName}</Text>
                                    <Text style={styles.companyRif}>RIF: {safeCompanyRif}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.headerTitle}>COMPROBANTE DE PAGO POR CANON DE ARRENDAMIENTO</Text>
                    </View>

                    {/* Amounts Banner */}
                    <View style={styles.receiptBanner}>
                        <Text style={styles.labelCol}>RECIBO POR:</Text>
                        <View style={styles.amountValuesCol}>
                            <Text style={styles.amountBs}>{formatMoneyBs(totalBs)}</Text>
                            <Text style={styles.amountUsd}>{formatMoneyUsd(amountUsd)}</Text>
                        </View>
                        <View style={styles.amountLabelsCol}>
                            <Text style={styles.amountLabelBs}>BOLIVARES</Text>
                            <Text style={styles.amountLabelUsd}>DOLARES</Text>
                        </View>
                    </View>

                    {/* Rows */}
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>NOMBRE DEL CONSIGNANTE:</Text>
                        <Text style={styles.rowValueBg}>{safeTenantName}</Text>
                    </View>

                    <View style={{...styles.row, borderBottom: 'none'}}>
                        <Text style={styles.rowLabel}>CEDULA / RIF :</Text>
                        <Text style={styles.rowValueBg}>{safeTenantDoc}</Text>
                    </View>

                    {/* Property Row */}
                    <View style={styles.propRow}>
                        <Text style={styles.rowLabel}>TIPO DE INMUEBLE:</Text>
                        <Text style={styles.propValBg}>{safePropType.toUpperCase()}</Text>
                        <Text style={styles.propText}>No.</Text>
                        <Text style={styles.propValBg}>{propNumber}</Text>
                        <Text style={styles.propText}>EDIFICIO:</Text>
                        <Text style={styles.propValBg}>{propBldg.toUpperCase()}</Text>
                    </View>

                    {Boolean(owners && owners.length > 0) && (
                        <View style={{...styles.row, borderBottom: 'none'}}>
                            <Text style={styles.rowLabel}>PROPIETARIO(S):</Text>
                            {/* @ts-ignore */}
                            <Text style={styles.rowValueBg}>{owners!.map(o => String(o.name) + ' / ' + String(o.docId)).join(' — ')}</Text>
                        </View>
                    )}

                    {/* Observation */}
                    <View style={{marginBottom: 10}}>
                        <View style={{...styles.row, borderBottom: 'none', marginBottom: 2}}>
                            <Text style={styles.rowLabel}>OBSERVACION:</Text>
                            <Text style={styles.rowValueBg}>{safeConcept.toUpperCase()}</Text>
                        </View>
                        <View style={{flexDirection: 'row'}}>
                            <Text style={styles.rowLabel}>{''}</Text>
                            <Text style={{flex: 1, fontSize: 7, color: '#9ca3af', paddingLeft: 8}}>
                                El señalamiento del mes y año del canon de arrendamiento aquí recibido, esta sujeto a verificacion y auditoria
                            </Text>
                        </View>
                    </View>

                    {/* Math Grid */}
                    <View style={styles.grid}>
                        <View style={styles.gridRow}>
                            <Text style={styles.gridLabel}>FECHA DEL DEPOSITO:</Text>
                            <Text style={styles.gridVal}>{safeDate}</Text>
                        </View>
                        <View style={styles.gridRow}>
                            <Text style={styles.gridLabel}>MONTO EN BOLIVARES:</Text>
                            <Text style={styles.gridVal}>{formatMoneyBs(amountBs)}</Text>
                            <Text style={styles.gridLabelSm}>REFERENCIA:</Text>
                            <Text style={styles.gridValSm}>{safeRef || "N/A"}</Text>
                        </View>
                        <View style={styles.gridRow}>
                            <Text style={styles.gridLabel}>MONTO EN DIVISA:</Text>
                            <Text style={styles.gridVal}>{formatMoneyUsd(amountUsd)}</Text>
                            <Text style={styles.gridLabelSm}>TASA:</Text>
                            <Text style={styles.gridValSm}>{rate.toFixed(2)}</Text>
                        </View>

                        <View style={styles.subtotalCont}>
                            <Text style={styles.subtotalLabel}>SUBTOTAL:</Text>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>BOLIVARES:</Text>
                                <Text style={styles.gridVal}>{formatMoneyBs(amountBs)} Bs.</Text>
                            </View>
                            <View style={styles.gridRow}>
                                <Text style={styles.gridLabel}>DIVISAS:</Text>
                                <Text style={styles.gridVal}>{formatMoneyUsd(amountUsd)} USD</Text>
                            </View>
                            <View style={{...styles.gridRow, marginTop: 4, paddingTop: 4, borderTop: '1pt solid #d1d5db'}}>
                                <Text style={styles.totalLabel}>TOTAL Bs.:</Text>
                                <Text style={styles.totalVal}>{formatMoneyBs(totalBs)}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ flex: 1 }} />

                    {/* Sigs */}
                    <View style={styles.sigRow}>
                        <View style={styles.sigCol}><Text style={styles.sigText}>FIRMA DEL CONSIGNANTE</Text></View>
                        <View style={styles.sigCol}><Text style={styles.sigText}>FIRMA DE RECIBIDO</Text></View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text>Caracas, {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE')}</Text>
                        <View style={styles.footerRow}>
                            <Text>Elaborado por: {safeCompanyName} | Telf: {safeCompanyPhone} | RIF: {safeCompanyRif}</Text>
                            <Text>www.escritorio.legal | {safeCompanyEmail}</Text>
                        </View>
                    </View>

                </View>
            </Page>
        </Document>
    )
}
