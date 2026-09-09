import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { FieldError, fieldClassName } from '../../components/ui/form-field'
import { t } from '../../lib/i18n'

const schema = z.object({
  email: z.string().trim().min(1, t('validation.required')).email(t('auth.invalidEmail')),
  password: z.string().min(1, t('validation.required')).min(6, t('auth.passwordMin')),
})

export function AuthPage() {
  const [register, setRegister] = useState(false)
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
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
      <div className="auth__glow" />
      <div className="auth__card">
        <div className="brand__lockup">
          <span className="brand__mark">
            <img src="/icons/icon-192.svg" alt="" aria-hidden="true" />
          </span>
          <span>{t('brand.name')}</span>
        </div>
        <div className="auth__heading">
          <span className="eyebrow">{t('page.personalFinance')}</span>
          <h1>{register ? t('auth.createWorkspace') : t('auth.loginTitle')}</h1>
          <p>{register ? t('auth.registerDescription') : t('auth.loginDescription')}</p>
        </div>
        <form className="form__stack" onSubmit={form.handleSubmit(submit)}>
          <label className="form__field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              autoComplete="email"
              className={fieldClassName(Boolean(form.formState.errors.email))}
              aria-invalid={Boolean(form.formState.errors.email)}
              aria-describedby="auth-email-error"
              {...form.register('email')}
            />
            <FieldError id="auth-email-error" message={form.formState.errors.email?.message} />
          </label>
          <label className="form__field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              className={fieldClassName(Boolean(form.formState.errors.password))}
              aria-invalid={Boolean(form.formState.errors.password)}
              aria-describedby="auth-password-error"
              {...form.register('password')}
            />
            <FieldError
              id="auth-password-error"
              message={form.formState.errors.password?.message}
            />
          </label>
          <Button variant="primary" type="submit">
            {register ? t('auth.createAccount') : t('auth.login')}{' '}
            <Icon name="arrow-up-right" size={16} />
          </Button>
        </form>
        <button className="auth__switch" onClick={() => setRegister((value) => !value)}>
          {register ? t('auth.switchToLogin') : t('auth.switchToRegister')}
        </button>
        <span className="auth__note">
          <Icon name="sparkles" size={14} /> {supabase ? t('auth.active') : t('auth.demo')}
        </span>
      </div>
    </div>
  )
}
