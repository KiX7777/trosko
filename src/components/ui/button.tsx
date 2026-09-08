import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
