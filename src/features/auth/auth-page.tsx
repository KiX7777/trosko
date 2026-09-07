import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { t } from '../../lib/i18n'

const schema = z.object({
  email: z.string().email(t('auth.invalidEmail')),
  password: z.string().min(6, t('auth.passwordMin')),
})

export function AuthPage() {
  const [register, setRegister] = useState(false)
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'marko@example.com', password: 'password' },
  })
  async function submit(values: z.infer<typeof schema>) {
    if (supabase) {
      const result = register
        ? await supabase.auth.signUp(values)
        : await supabase.auth.signInWithPassword(values)
      if (result.error) {
        toast.error(result.error.message)
        return
      }
    } else {
      localStorage.setItem(
        'trosko-demo-session',
        JSON.stringify({ email: values.email, createdAt: new Date().toISOString() }),
      )
    }
    toast.success(register ? t('auth.accountCreated') : t('auth.welcomeToast'))
    navigate('/dashboard')
  }
  return (
    <div className="auth-shell">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Icon name="trend" size={18} />
          </span>
          <span>{t('brand.name')}</span>
        </div>
        <div className="auth-heading">
          <span className="eyebrow">{t('page.personalFinance')}</span>
          <h1>{register ? t('auth.createWorkspace') : t('auth.loginTitle')}</h1>
          <p>{register ? t('auth.registerDescription') : t('auth.loginDescription')}</p>
        </div>
        <form className="form-stack" onSubmit={form.handleSubmit(submit)}>
          <label className="form-field">
            <span>{t('auth.email')}</span>
            <input type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email && <small>{form.formState.errors.email.message}</small>}
          </label>
          <label className="form-field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <small>{form.formState.errors.password.message}</small>
            )}
          </label>
          <Button variant="primary" type="submit">
            {register ? t('auth.createAccount') : t('auth.login')}{' '}
            <Icon name="arrow-up-right" size={16} />
          </Button>
        </form>
        <button className="auth-switch" onClick={() => setRegister((value) => !value)}>
          {register ? t('auth.switchToLogin') : t('auth.switchToRegister')}
        </button>
        <span className="auth-note">
          <Icon name="sparkles" size={14} /> {supabase ? t('auth.active') : t('auth.demo')}
        </span>
      </div>
    </div>
  )
}
