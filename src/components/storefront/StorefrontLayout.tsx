import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { CookieConsentBanner } from './legal/CookieConsentBanner';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { getFlowVaultConfig } from '@/config/flowVaultConfig';

function DeviceFilter() {
  const { data, globalDeviceId, setGlobalDeviceId } = useStoreReadModel();

  useEffect(() => {
    const clear = () => setGlobalDeviceId('');
    window.addEventListener('flowvault:clear-device', clear);
    return () => window.removeEventListener('flowvault:clear-device', clear);
  }, [setGlobalDeviceId]);

  if (!data || data.devices.length === 0) return null;

  return (
    <label className="maison-device-filter">
      <span className="sr-only">Filter by watch device</span>
      <select
        value={globalDeviceId}
        onChange={(event) => setGlobalDeviceId(event.target.value)}
        aria-label="Filter by watch device"
      >
        <option value="">All Watches</option>
        {data.devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.brand} {device.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const primaryNavigation = [
  { to: '/#all-models', label: 'Timepieces' },
  { to: '/collections', label: 'Collections' },
  { to: '/philosophy', label: 'Philosophy' },
  { to: '/journal', label: 'Journal' },
];

export function StorefrontLayout() {
  const location = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const config = getFlowVaultConfig();
  const isStaging = config.environment === 'staging';

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!location.pathname.startsWith('/search')) {
      document.title = 'FlowVault — Digital Timepieces';
    }
  }, [location.pathname]);

  useEffect(() => {
    const selector = 'meta[name="robots"][data-flowvault-environment]';
    const existing = document.head.querySelector<HTMLMetaElement>(selector);
    if (!isStaging) {
      existing?.remove();
      return;
    }
    const meta = existing ?? document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow, noarchive';
    meta.dataset.flowvaultEnvironment = 'staging';
    if (!existing) document.head.appendChild(meta);
    return () => meta.remove();
  }, [isStaging]);

  return (
    <div className="storefront-maison min-h-screen flex flex-col">
      {isStaging && (
        <div className="border-b border-amber-400/40 bg-amber-300 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-black">
          Sandbox / Test Mode — No real payments
        </div>
      )}
      <header className="maison-header">
        <div className="maison-header-main">
          <Link to="/" className="maison-brand" aria-label="FlowVault home">
            <img src={logoSrc} alt="" className="maison-brand-mark" />
            <span>FlowVault</span>
          </Link>

          <nav className="maison-nav maison-nav-desktop" aria-label="Primary navigation">
            {primaryNavigation.map((item) => (
              <MaisonNavLink key={item.to} {...item} currentPath={location.pathname} />
            ))}
          </nav>

          <div className="maison-header-tools">
            <DeviceFilter />
          </div>
        </div>

        <nav className="maison-nav-mobile" aria-label="Mobile navigation">
          {primaryNavigation.map((item) => (
            <MaisonNavLink key={item.to} {...item} currentPath={location.pathname} />
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="maison-footer">
        <div className="maison-footer-grid">
          <div className="maison-footer-brand">
            <Link to="/" className="maison-brand">
              <img src={logoSrc} alt="" className="maison-brand-mark" />
              <span>FlowVault</span>
            </Link>
            <p>Digital timepieces shaped by proportion, restraint, and functional intelligence.</p>
          </div>

          <FooterColumn title="Maison">
            <Link to="/collections">Collections</Link>
            <Link to="/search">New Releases</Link>
            <Link to="/philosophy">Philosophy</Link>
            <Link to="/journal">Journal</Link>
          </FooterColumn>

          <FooterColumn title="Client Services">
            <Link to="/search">Search</Link>
            <Link to="/support">Support</Link>
            <Link to="/refunds">Refunds</Link>
            <a href="mailto:business@fvwatchfaces.com">Contact</a>
          </FooterColumn>

          <FooterColumn title="Legal">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/eula">EULA</Link>
            <Link to="/cookies">Cookies</Link>
            <Link to="/legal">Legal Notices</Link>
          </FooterColumn>
        </div>

        <div className="maison-footer-bottom">
          <p>© {new Date().getFullYear()} Flow Vault Tech LLC, operating under the FlowVault Watch Faces brand. All rights reserved.</p>
          <p>Designed as a digital watchmaking maison.</p>
        </div>
      </footer>

      <CookieConsentBanner />
    </div>
  );
}

function MaisonNavLink({
  to,
  label,
  currentPath,
}: {
  to: string;
  label: string;
  currentPath: string;
}) {
  const isActive = to === '/search' && currentPath.startsWith('/search');
  return (
    <Link to={to} className={isActive ? 'is-active' : undefined}>
      {label}
    </Link>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="maison-footer-column">
      <p>{title}</p>
      <div>{children}</div>
    </div>
  );
}
