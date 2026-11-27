import { supabase } from '@/lib/supabase'

/**
 * Obtiene el access_token JWT de la sesión activa de Supabase.
 */
export async function getAccessToken(): Promise<string> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token || ''
}

/**
 * Wrapper de `fetch` para llamadas del cliente a rutas `/api/*` protegidas.
 * Adjunta automáticamente `Authorization: Bearer <access_token>`.
 */
export async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    const token = await getAccessToken()
    const headers = new Headers(init.headers)
    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(input, {
        ...init,
        headers,
    })
}
