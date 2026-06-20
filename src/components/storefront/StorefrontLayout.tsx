import { Link, Outlet, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { CookieConsentBanner } from './legal/CookieConsentBanner';

export function StorefrontLayout() {
  const location = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <div className="min-h-screen vault-shell flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#20252f] bg-[#090a0c]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 group"
          >
            <img
              src={logoSrc}
              alt="Flowvault"
              className="h-8 w-auto object-contain"
            />
            <span className="font-sans font-light text-lg tracking-tight text-[#E1E4EA] group-hover:text-white transition-colors">
              Flowvault
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <NavLink to="/" label="Browse" currentPath={location.pathname} />
            <NavLink to="/category/premium" label="Premium" currentPath={location.pathname} />
            <NavLink to="/category/simple" label="Simple" currentPath={location.pathname} />
            <NavLink to="/category/funny" label="Funny" currentPath={location.pathname} />
          </nav>

          {/* Right: search only (Studio removed from public nav) */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3a4452] bg-[#141820]/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d5b987]" />
              <span className="font-mono text-[11px] uppercase tracking-wide text-[#aeb5c1]">Premium Store</span>
            </div>
            <SearchBar compact />
          </div>

        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#20252f] mt-16 bg-[#0b0d11]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">

          {/* Top row: brand + nav columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src={logoSrc} alt="Flowvault" className="h-5 w-auto object-contain" />
                <span className="font-sans font-light text-[#E1E4EA]">Flowvault</span>
              </div>
              <p className="text-xs text-[#5a6373] leading-relaxed">
                Premium watchfaces for Amazfit &amp; ZeppOS devices.
              </p>
            </div>

            {/* Store */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#5a6373] mb-3">Store</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Browse</Link></li>
                <li><Link to="/category/premium" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Premium</Link></li>
                <li><Link to="/category/simple" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Simple</Link></li>
                <li><Link to="/category/funny" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Funny</Link></li>
                <li><Link to="/support" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Support</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#5a6373] mb-3">Legal</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/terms" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/eula" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">EULA</Link></li>
                <li><Link to="/refunds" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Refund Policy</Link></li>
                <li><Link to="/cookies" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Cookie Policy</Link></li>
                <li><Link to="/legal" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Legal Notices</Link></li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#5a6373] mb-3">Policies</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/acceptable-use" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Acceptable Use</Link></li>
                <li><Link to="/copyright" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Copyright / DMCA</Link></li>
                <li><Link to="/support" className="text-[#8f9aac] hover:text-[#E1E4EA] transition-colors">Support Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#1a1f28] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4a5363]">
            <p className="font-mono">© {new Date().getFullYear()} Flowvault. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-[#8f9aac] transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-[#8f9aac] transition-colors">Terms</Link>
              <Link to="/cookies" className="hover:text-[#8f9aac] transition-colors">Cookies</Link>
              <Link to="/copyright" className="hover:text-[#8f9aac] transition-colors">© Report</Link>
            </div>
          </div>

        </div>
      </footer>

      {/* ── Cookie consent banner ──────────────────────────────────────── */}
      <CookieConsentBanner />
    </div>
  );
}

// ── Small helper: active-aware nav link ────────────────────────────────────

function NavLink({
  to,
  label,
  currentPath,
}: {
  to: string;
  label: string;
  currentPath: string;
}) {
  const isActive =
    to === '/'
      ? currentPath === '/'
      : currentPath.startsWith(to);

  return (
    <Link
      to={to}
      className={`
        px-3 py-1.5 rounded-full font-sans text-sm transition-colors relative border
        ${isActive
          ? 'text-[#f3e4c8] font-medium border-[#6c5733] bg-[#c7a86f]/10'
          : 'text-[#8E9196] border-transparent hover:text-[#D9DBE0] hover:border-[#313843]'
        }
      `}
    >
      {label}
    </Link>
  );
}
