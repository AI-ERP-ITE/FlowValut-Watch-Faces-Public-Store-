import { Link, Outlet, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';

export function StorefrontLayout() {
  const location = useLocation();

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#bc9456] via-[#e0c189] to-[#8c6b3f] flex items-center justify-center shadow-lg shadow-[#c7a86f]/30">
              <span className="text-white font-bold text-xs">FV</span>
            </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#9198a4]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#bc9456] via-[#e0c189] to-[#8c6b3f] flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">FV</span>
            </div>
            <span className="font-sans font-light text-[#E1E4EA]">Flowvault</span>
          </div>
          <p className="font-mono text-xs text-[#9198a4]">
            Premium watchfaces for Amazfit &amp; ZeppOS devices
          </p>
          <div className="flex items-center gap-4 text-xs font-sans">
            <Link to="/" className="hover:text-[#E1E4EA] transition-colors">Browse</Link>
            <Link to="/category/premium" className="hover:text-[#E1E4EA] transition-colors">Premium</Link>
          </div>
        </div>
      </footer>
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
