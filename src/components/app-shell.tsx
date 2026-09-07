import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useUIStore } from '../stores/ui-store'
import { Icon } from './ui/icon'
import { Button } from './ui/button'
import { QuickAddModal } from '../features/transactions/quick-add-modal'
import { useQuery } from '@tanstack/react-query'
import { getProfile } from '../lib/repository'
import { t } from '../lib/i18n'

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
  const location = useLocation()
  const openQuickAdd = useUIStore((state) => state.openQuickAdd)
  const current = [...primaryNav, ...secondaryNav].find((item) => location.pathname === item.to)
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const displayName = profile.data?.displayName || profile.data?.email || t('common.user')
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="app-shell product-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-lockup">
          <span className="brand-mark">
            <Icon name="trend" size={18} />
          </span>
          <span>{t('brand.name')}</span>
        </div>
        <div className="sidebar-scroll">
          <nav className="sidebar-nav">
            {primaryNav.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
            <span className="nav-caption">{t('nav.manage')}</span>
            {secondaryNav.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <span>
              <strong>{displayName}</strong>
              <small>
                {t('workspace.currency', { currency: profile.data?.primaryCurrency ?? 'EUR' })}
              </small>
            </span>
            <Icon name="more" size={16} />
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label={t('aria.closeMenu')}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="app-header">
          <div className="header-inner">
            <Button
              variant="icon"
              className="mobile-menu"
              aria-label={t('aria.openMenu')}
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" />
            </Button>
            <div>
              <span className="header-kicker">{t('page.personalFinance')}</span>
              <h1>{current ? t(current.key) : t('nav.dashboard')}</h1>
            </div>
            <div className="header-actions">
              <Button
                variant="icon"
                aria-label={t('aria.search')}
                onClick={() => openQuickAdd('expense')}
              >
                <Icon name="search" />
              </Button>
              <Button variant="icon" aria-label={t('aria.notifications')}>
                <Icon name="bell" />
              </Button>
              <button className="header-avatar" aria-label={t('aria.profile')}>
                <span>{initials}</span>
              </button>
            </div>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <nav className="mobile-nav">
        {primaryNav.slice(0, 2).map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
        <button
          className="mobile-quick-add"
          aria-label={t('aria.addTransaction')}
          onClick={() => openQuickAdd('expense')}
        >
          <Icon name="plus" size={20} />
        </button>
        {primaryNav.slice(3, 4).map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
        <NavLink className="mobile-nav-item" to="/settings">
          <Icon name="more" size={18} />
          <span>{t('nav.more')}</span>
        </NavLink>
      </nav>
      <QuickAddModal />
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
        `${mobile ? 'mobile-nav-item' : 'sidebar-link'} ${isActive ? 'active' : ''}`
      }
      to={item.to}
    >
      <Icon name={item.icon} size={18} />
      <span>{mobile && item.key === 'nav.dashboard' ? t('nav.home') : t(item.key)}</span>
    </NavLink>
  )
}
