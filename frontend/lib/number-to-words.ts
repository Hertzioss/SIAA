const ones = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
    'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']

const tens = ['', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA', 'CIEN']

const hundreds = ['CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function convertGroup(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'

    let result = ''

    const h = Math.floor(n / 100)
    const t = Math.floor((n % 100) / 10)
    const o = n % 10

    if (h > 0) {
        result += hundreds[h - 1]
    }

    const remainder = n % 100
    if (remainder === 0) return result

    if (result) result += ' '

    if (remainder < 30) {
        result += ones[remainder]
    } else {
        result += tens[t]
        if (o > 0) {
            result += ' Y ' + ones[o]
        }
    }

    return result
}

export function numberToWords(amount: number, currency: 'USD' | 'VES' = 'USD'): string {
    const intPart = Math.floor(amount)
    const centavos = Math.round((amount - intPart) * 100)

    const currencyName = currency === 'USD' ? 'DÓLARES AMERICANOS' : 'BOLÍVARES'

    if (intPart === 0) return `CERO ${currencyName} CON ${centavos > 0 ? centavos + '/100' : '00/100'}`

    let result = ''

    const millions = Math.floor(intPart / 1000000)
    const thousands = Math.floor((intPart % 1000000) / 1000)
    const units = intPart % 1000

    if (millions > 0) {
        result += convertGroup(millions)
        if (millions === 1) {
            result += ' MILLÓN'
        } else {
            result += ' MILLONES'
        }
    }

    if (thousands > 0) {
        if (result) result += ' '
        if (thousands === 1) {
            result += 'MIL'
        } else {
            result += convertGroup(thousands) + ' MIL'
        }
    }

    if (units > 0) {
        if (result) result += ' '
        result += convertGroup(units)
    }

    result += ` ${currencyName} CON ${centavos > 0 ? centavos + '/100' : '00/100'}`

    return result
}
