import type { FallbackProps } from 'react-error-boundary'
import { AlertTriangle, House, RefreshCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

type ErrorDetails = {
  code?: number
  title: string
  description: string
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        code: error.status,
        title: 'Stranica nije pronađena',
        description: 'Adresa koju ste otvorili ne postoji ili je premještena.',
      }
    }

    return {
      code: error.status,
      title: 'Nije moguće otvoriti ovu stranicu',
      description: 'Dogodila se poteškoća pri učitavanju. Pokušajte ponovno za koji trenutak.',
    }
  }

  return {
    title: 'Nešto je pošlo po zlu',
    description:
      'Aplikacija je naišla na neočekivanu poteškoću. Vaši spremljeni podaci nisu promijenjeni.',
  }
}

function ErrorPageContent({ error }: { error: unknown }) {
  const { code, title, description } = getErrorDetails(error)

  return (
    <main className="error-page" role="alert" aria-labelledby="error-page-title">
      <div className="error-page__ambient" aria-hidden="true" />
      <section className="error-page__panel">
        <div className="error-page__brand" aria-label="Troško">
          <span className="error-page__brand-mark">
            <img src="/icons/icon-192.svg" alt="" />
          </span>
          <span>Troško</span>
        </div>

        <div className="error-page__signal" aria-hidden="true">
          <AlertTriangle size={27} strokeWidth={1.8} />
        </div>
        <p className="error-page__eyebrow">{code ? `GREŠKA ${code}` : 'PREKID U UČITAVANJU'}</p>
        <h1 id="error-page-title">{title}</h1>
        <p className="error-page__description">{description}</p>

        <div className="error-page__actions">
          <button
            type="button"
            className="error-page__action error-page__action--primary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Pokušaj ponovno
          </button>
          <a className="error-page__action error-page__action--secondary" href="/dashboard">
            <House size={17} aria-hidden="true" />
            Na nadzornu ploču
          </a>
        </div>
      </section>
    </main>
  )
}

export function RouteErrorPage() {
  return <ErrorPageContent error={useRouteError()} />
}

export function ApplicationErrorPage({ error }: FallbackProps) {
  return <ErrorPageContent error={error} />
}
