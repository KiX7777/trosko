export function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: string
  tone?: 'neutral' | 'positive' | 'negative' | 'warning' | 'indigo'
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}
