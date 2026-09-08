export function fieldClassName(invalid: boolean) {
  return invalid ? 'field--invalid' : undefined
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <small id={id} className="field__error" role="alert">
      {message}
    </small>
  )
}
