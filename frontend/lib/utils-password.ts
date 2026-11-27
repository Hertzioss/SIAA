/**
 * Genera contraseñas aleatorias criptográficamente seguras usando Web Crypto API
 * (compatible con Node 20+ y navegadores modernos, sin Math.random()).
 */
export const generatePassword = (length = 12): string => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
    const maxUnbiased = Math.floor(256 / charset.length) * charset.length
    const chars: string[] = []
    const buffer = new Uint8Array(length * 2)

    while (chars.length < length) {
        globalThis.crypto.getRandomValues(buffer)
        for (let i = 0; i < buffer.length && chars.length < length; i++) {
            if (buffer[i] < maxUnbiased) {
                chars.push(charset.charAt(buffer[i] % charset.length))
            }
        }
    }

    return chars.join("")
}
