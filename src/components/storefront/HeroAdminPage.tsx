import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '@/context/CatalogContext';
import { readHeroConfig, resolveFeaturedFace, saveHeroConfig } from './heroConfig';

export function HeroAdminPage() {
  const { catalog, loading, error, baseUrl } = useCatalog();
  const initialConfig = useMemo(() => readHeroConfig(), []);
  const [featuredFaceId, setFeaturedFaceId] = useState<string>(initialConfig.featuredFaceId ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const featuredPreview = useMemo(() => {
    const candidate = resolveFeaturedFace(catalog, {
      featuredFaceId: featuredFaceId || null,
    });
    return candidate;
  }, [catalog, featuredFaceId]);

  function handleSave() {
    saveHeroConfig({
      featuredFaceId: featuredFaceId || null,
    });
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="min-h-screen vault-shell max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <nav className="text-xs font-mono text-[#8E9196] mb-4 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#E1E4EA] transition-colors">Browse</Link>
          <span>/</span>
          <span className="text-[#E1E4EA]">Hero Admin</span>
        </nav>
        <h1 className="text-3xl font-light text-[#E1E4EA]">Store Hero Admin</h1>
        <p className="text-sm text-[#8E9196] mt-2">
          Pick which watchface appears in the public homepage hero.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-[#8E9196] font-mono">Loading catalog...</div>
      )}

      {error && (
        <div className="text-sm text-red-400 font-mono">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="vault-panel p-5">
            <label htmlFor="featured-face" className="block vault-micro mb-2">
              Featured Watchface
            </label>
            <select
              id="featured-face"
              value={featuredFaceId}
              onChange={(e) => setFeaturedFaceId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 vault-input focus:outline-none"
            >
              <option value="">Use first catalog item</option>
              {catalog.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} ({entry.id})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSave}
              className="mt-4 px-4 py-2 rounded-lg bg-[#bc9456] hover:bg-[#d2af78] text-[#17120a] font-semibold text-sm transition-colors"
            >
              Save Hero Settings
            </button>

            {savedAt && (
              <p className="mt-2 text-xs text-[#8E9196] font-mono">Saved at {savedAt}</p>
            )}
          </div>

          <div className="vault-panel p-5">
            <p className="vault-micro mb-3">Current Preview</p>
            {featuredPreview ? (
              <>
                <div className="aspect-square rounded-xl overflow-hidden bg-[#121418] border border-[#2f3743]">
                  <img
                    src={`${baseUrl}${featuredPreview.previewPath}`}
                    alt={featuredPreview.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="mt-3 text-[#E1E4EA] font-medium">{featuredPreview.name}</p>
                <p className="text-xs text-[#8E9196] font-mono">id: {featuredPreview.id}</p>
              </>
            ) : (
              <p className="text-sm text-[#8E9196]">No preview available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
