import { Link, Outlet, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';

export function StorefrontLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#101115] text-[#D9DBE0] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#181A1F] bg-[#101115]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-xs">FV</span>
            </div>
            <span className="font-sans font-light text-lg tracking-tight text-[#D9DBE0] group-hover:text-white transition-colors">
              Flowvault
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-3 text-sm">
            <NavLink to="/" label="Browse" currentPath={location.pathname} />
            <NavLink to="/category/premium" label="Premium" currentPath={location.pathname} />
            <NavLink to="/category/simple" label="Simple" currentPath={location.pathname} />
            <NavLink to="/category/funny" label="Funny" currentPath={location.pathname} />
          </nav>

          {/* Right: search only (Studio removed from public nav) */}
          <div className="flex items-center gap-3">
            <SearchBar compact />
          </div>

        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#181A1F] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#8E9196]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">FV</span>
            </div>
            <span className="font-sans font-light text-[#D9DBE0]">Flowvault</span>
          </div>
          <p className="font-mono text-xs text-[#8E9196]">
            Premium watchfaces for Amazfit &amp; ZeppOS devices
          </p>
          <div className="flex items-center gap-4 text-xs font-sans">
            <Link to="/" className="hover:text-[#D9DBE0] transition-colors">Browse</Link>
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
        px-3 py-1.5 rounded-md font-sans text-sm transition-colors relative
        ${isActive
          ? 'text-[#D9DBE0] font-medium after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:bg-[#C0A678]'
          : 'text-[#8E9196] hover:text-[#D9DBE0]'
        }
      `}
    >
      {label}
    </Link>
  );
}
