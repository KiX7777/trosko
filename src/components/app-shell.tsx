import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/ui-store'
import { Icon } from './ui/icon'
import { Button } from './ui/button'
import { useProfileQuery } from '../hooks/use-profile-queries'
import { t } from '../lib/i18n'
import { supabase } from '../lib/supabase'

const QuickAddModal = lazy(() =>
  import('../features/transactions/quick-add-modal').then(({ QuickAddModal }) => ({
    default: QuickAddModal,
  })),
)

const primaryNav = [
  { to: '/dashboard', key: 'nav.dashboard' as const, icon: 'dashboard' },
  { to: '/transactions', key: 'nav.transactions' as const, icon: 'receipt' },
  { to: '/accounts', key: 'nav.accounts' as const, icon: 'wallet' },
  { to: '/analytics', key: 'nav.analytics' as const, icon: 'analytics' },
  { to: '/recurring', key: 'nav.recurring' as const, icon: 'calendar-days' },
]
const secondaryNav = [
  { to: '/receipts', key: 'nav.receipts' as const, icon: 'file-text' },
  { to: '/categories', key: 'nav.categories' as const, icon: 'tags' },
  { to: '/labels', key: 'nav.labels' as const, icon: 'tags' },
  { to: '/settings', key: 'nav.settings' as const, icon: 'settings' },
]

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const openQuickAdd = useUIStore((state) => state.openQuickAdd)
  const current = [...primaryNav, ...secondaryNav].find((item) => location.pathname === item.to)
  const profile = useProfileQuery()
  const displayName = profile.data?.displayName || profile.data?.email || t('common.user')
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    if (!profileMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileMenuOpen])

  async function handleLogout() {
    setProfileMenuOpen(false)
    if (supabase) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem('trosko-demo-session')
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell product-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand__lockup">
          <span className="brand__mark">
            <img src="/icons/icon-192.svg" alt="" aria-hidden="true" />
          </span>
          <span>{t('brand.name')}</span>
        </div>
        <div className="sidebar__scroll">
          <nav className="sidebar__nav">
            {primaryNav.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
            <span className="sidebar__caption">{t('nav.manage')}</span>
            {secondaryNav.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
        </div>
        <div className="sidebar__footer">
          <div className="user-menu" ref={profileMenuRef}>
            <div className="user-menu__chip">
              <button
                type="button"
                className="avatar user-menu__trigger"
                aria-label={t('aria.profile')}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                {initials}
              </button>
              <span>
                <strong>{displayName}</strong>
              </span>
            </div>
            {profileMenuOpen && (
              <div className="user-menu__popover" role="menu">
                <button
                  type="button"
                  className="user-menu__logout"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <Icon name="log-out" size={16} />
                  <span>{t('auth.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar__scrim"
          aria-label={t('aria.closeMenu')}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="app__main">
        <header className="header">
          <div className="header__inner">
            <Button
              variant="icon"
              className="header__mobile-menu"
              aria-label={t('aria.openMenu')}
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" />
            </Button>
            <div>
              <span className="header__kicker">{t('page.personalFinance')}</span>
              <h1>{current ? t(current.key) : t('nav.dashboard')}</h1>
            </div>
            <div className="header__actions">
              <Button
                variant="icon"
                aria-label={t('aria.addTransaction')}
                onClick={() => openQuickAdd('expense')}
              >
                <Icon name="plus" />
              </Button>
              <button className="header__avatar" aria-label={t('aria.profile')}>
                <span>{initials}</span>
              </button>
            </div>
          </div>
        </header>
        <main className="app__content">
          <Outlet />
        </main>
      </div>
      <nav className="mobile-nav">
        {primaryNav.slice(0, 2).map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
        <button
          className="mobile-nav__quick-add"
          aria-label={t('aria.addTransaction')}
          onClick={() => openQuickAdd('expense')}
        >
          <Icon name="plus" size={20} />
        </button>
        {primaryNav.slice(3, 4).map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
        <NavLink className="mobile-nav__item" to="/settings">
          <Icon name="more" size={18} />
          <span>{t('nav.more')}</span>
        </NavLink>
      </nav>
      <Suspense fallback={null}>
        <QuickAddModal />
      </Suspense>
    </div>
  )
}

function NavItem({
  item,
  mobile = false,
}: {
  item: { to: string; key: Parameters<typeof t>[0]; icon: string }
  mobile?: boolean
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        `${mobile ? 'mobile-nav__item' : 'sidebar__link'} ${isActive ? 'is-active' : ''}`
      }
      to={item.to}
    >
      <Icon name={item.icon} size={18} />
      <span>{mobile && item.key === 'nav.dashboard' ? t('nav.home') : t(item.key)}</span>
    </NavLink>
  )
}
