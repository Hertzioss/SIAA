'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Clock } from 'lucide-react'

const STORAGE_KEY = 'app_last_activity_at'
const ACTIVITY_THROTTLE_MS = 15_000
const CHECK_INTERVAL_MS = 1_000

interface SessionTimeoutGuardProps {
    /** Tiempo máximo de inactividad en minutos (por defecto 30 min) */
    timeoutMinutes?: number
    /** Minutos antes del cierre para mostrar el aviso preventivo (por defecto 2 min) */
    warningMinutes?: number
}

/**
 * Cierra automáticamente la sesión tras `timeoutMinutes` sin actividad del usuario,
 * sincronizando actividad entre pestañas mediante localStorage y mostrando un aviso previo.
 */
export function SessionTimeoutGuard({
    timeoutMinutes = 30,
    warningMinutes = 2,
}: SessionTimeoutGuardProps) {
    const router = useRouter()
    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = warningMinutes * 60 * 1000

    const [warningOpen, setWarningOpen] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(warningMinutes * 60)

    const lastWriteRef = useRef<number>(0)
    const signingOutRef = useRef<boolean>(false)

    const recordActivity = useCallback((force = false) => {
        const now = Date.now()
        if (!force && now - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return
        lastWriteRef.current = now
        try {
            localStorage.setItem(STORAGE_KEY, String(now))
        } catch {
            // Ignore storage quota / private mode errors
        }
    }, [])

    const getLastActivity = useCallback((): number => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            const parsed = stored ? Number(stored) : NaN
            if (Number.isFinite(parsed) && parsed > 0) return parsed
        } catch {
            // Ignore storage errors
        }
        return lastWriteRef.current || Date.now()
    }, [])

    const performIdleLogout = useCallback(async () => {
        if (signingOutRef.current) return
        signingOutRef.current = true
        setWarningOpen(false)
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            // Ignore storage errors
        }
        try {
            await supabase.auth.signOut()
        } catch (err) {
            console.error('Error signing out on inactivity:', err)
        }
        toast.info('Sesión cerrada por inactividad', {
            description: `Tu sesión expiró tras ${timeoutMinutes} minutos sin actividad.`,
            duration: 6000,
        })
        router.replace('/signin')
    }, [router, timeoutMinutes])

    const handleStayConnected = useCallback(() => {
        recordActivity(true)
        setWarningOpen(false)
    }, [recordActivity])

    useEffect(() => {
        // Initialize timestamp on mount (or log out immediately if already expired from a previous tab)
        const existing = (() => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                return raw ? Number(raw) : null
            } catch {
                return null
            }
        })()

        if (existing && Number.isFinite(existing) && Date.now() - existing >= timeoutMs) {
            const immediateTimer = window.setTimeout(() => {
                void performIdleLogout()
            }, 0)
            return () => window.clearTimeout(immediateTimer)
        }

        recordActivity(true)

        const onUserActivity = () => {
            // While warning modal is visible, require explicit click on "Seguir conectado"
            if (!warningOpen) {
                recordActivity(false)
            }
        }

        const events: (keyof WindowEventMap)[] = [
            'mousemove',
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'click',
        ]
        events.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }))

        const checkInactivity = () => {
            if (signingOutRef.current) return
            const elapsed = Date.now() - getLastActivity()
            const remaining = timeoutMs - elapsed

            if (remaining <= 0) {
                performIdleLogout()
            } else if (remaining <= warningMs) {
                setSecondsLeft(Math.max(1, Math.ceil(remaining / 1000)))
                setWarningOpen(true)
            } else {
                setWarningOpen(false)
            }
        }

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkInactivity()
            }
        }

        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                checkInactivity()
            }
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('storage', onStorage)
        const interval = window.setInterval(checkInactivity, CHECK_INTERVAL_MS)

        return () => {
            events.forEach((evt) => window.removeEventListener(evt, onUserActivity))
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('storage', onStorage)
            window.clearInterval(interval)
        }
    }, [getLastActivity, performIdleLogout, recordActivity, timeoutMs, warningMs, warningOpen])

    const mins = Math.floor(secondsLeft / 60)
    const secs = String(secondsLeft % 60).padStart(2, '0')

    return (
        <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600" />
                        Tu sesión está por cerrarse
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Por seguridad, la sesión se cerrará automáticamente en{' '}
                        <strong className="text-foreground tabular-nums">
                            {mins}:{secs}
                        </strong>{' '}
                        por inactividad. ¿Deseas continuar conectado?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => performIdleLogout()}>
                        Cerrar sesión
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleStayConnected}>
                        Seguir conectado
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
