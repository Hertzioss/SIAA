export interface ExchangeRate {
    fuente: string;
    nombre: string;
    compra: number | null;
    venta: number | null;
    promedio: number;
    fechaActualizacion: string;
}

export const fetchBcvRate = async (): Promise<number | null> => {
    try {
        const url = process.env.NEXT_PUBLIC_DOLAR_API_URL || 'https://ve.dolarapi.com/v1/dolares';
        const response = await fetch(url, { cache: 'no-store' }); // Disable cache to get latest rate
        if (!response.ok) throw new Error('Failed to fetch rates');

        const data: ExchangeRate[] = await response.json();
        const bcv = data.find(rate => rate.fuente === 'oficial');

        return bcv ? bcv.promedio : null;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
    }
}
