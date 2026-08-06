import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { CookieConsentBanner } from './legal/CookieConsentBanner';
import { useStoreReadModel } from '@/context/StoreReadModelContext';

function DeviceFilter() {
  const { data, globalDeviceId, setGlobalDeviceId } = useStoreReadModel();
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
  { to: '/#collections', label: 'Collections' },
  { to: '/#new-releases', label: 'New Releases' },
  { to: '/#philosophy', label: 'Philosophy' },
  { to: '/#journal', label: 'Journal' },
];

export function StorefrontLayout() {
  const location = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  useEffect(() => {
    if (!location.pathname.startsWith('/search')) {
      document.title = 'FlowVault — Digital Timepieces';
    }
  }, [location.pathname]);

  return (
    <div className="storefront-maison min-h-screen flex flex-col">
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
            <MaisonNavLink to="/search" label="Search" currentPath={location.pathname} />
          </nav>

          <div className="maison-header-tools">
            <DeviceFilter />
            <div className="hidden xl:block"><SearchBar key={location.search} compact /></div>
            <Link to="/search" className="maison-search-button xl:hidden" aria-label="Search timepieces">
              <Search size={17} strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <nav className="maison-nav-mobile" aria-label="Mobile navigation">
          {primaryNavigation.map((item) => (
            <MaisonNavLink key={item.to} {...item} currentPath={location.pathname} />
          ))}
          <MaisonNavLink to="/search" label="Search" currentPath={location.pathname} />
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
            <Link to="/#collections">Collections</Link>
            <Link to="/#new-releases">New Releases</Link>
            <Link to="/#philosophy">Philosophy</Link>
            <Link to="/#journal">Journal</Link>
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
          <p>© {new Date().getFullYear()} FlowVault. All rights reserved.</p>
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
