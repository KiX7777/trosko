import { useEffect, useState, type PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { t } from '../../lib/i18n'

export function AuthGate({ children }: PropsWithChildren) {
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setReady(true)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (!ready) return <div className="auth__loading">{t('auth.loading')}</div>
  if (supabase && !session)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
