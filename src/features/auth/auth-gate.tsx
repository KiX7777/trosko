'use client'

import { useEffect, useState, type PropsWithChildren } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { t } from '../../lib/i18n'

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const router = useRouter()
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

  useEffect(() => {
    if (ready && supabase && !session) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, ready, router, session])

  if (!ready) return <div className="auth__loading">{t('auth.loading')}</div>
  if (supabase && !session) return null
  return <>{children}</>
}
