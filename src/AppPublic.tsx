import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CatalogProvider } from '@/context/CatalogContext';
import { StorefrontLayout } from '@/components/storefront/StorefrontLayout';
import { StoreReadModelProvider } from '@/context/StoreReadModelContext';
import { publicStoreArchitectureFlags } from '@/lib/publicStoreArchitecture';

const HomePage = lazy(() => import('@/components/storefront/HomePage').then((module) => ({ default: module.HomePage })));
const ModelPage = lazy(() => import('@/components/storefront/ModelPage').then((module) => ({ default: module.ModelPage })));
const CategoryPage = lazy(() => import('@/components/storefront/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const ProductPage = lazy(() => import('@/components/storefront/ProductPage').then((module) => ({ default: module.ProductPage })));
const SearchPage = lazy(() => import('@/components/storefront/SearchPage').then((module) => ({ default: module.SearchPage })));
const BuyPage = lazy(() => import('@/components/storefront/BuyPage').then((module) => ({ default: module.BuyPage })));
const OfferBuyPage = lazy(() => import('@/components/storefront/OfferBuyPage').then((module) => ({ default: module.OfferBuyPage })));
const SuccessPage = lazy(() => import('@/components/storefront/SuccessPage').then((module) => ({ default: module.SuccessPage })));
const DesignModelHomePage = lazy(() => import('@/components/storefront/DesignModelHomePage').then((module) => ({ default: module.DesignModelHomePage })));
const CollectionPage = lazy(() => import('@/components/storefront/CollectionPage').then((module) => ({ default: module.CollectionPage })));
const DesignModelPage = lazy(() => import('@/components/storefront/DesignModelPage').then((module) => ({ default: module.DesignModelPage })));
const LegacyFaceResolver = lazy(() => import('@/components/storefront/DesignModelPage').then((module) => ({ default: module.LegacyFaceResolver })));
const DeviceCompatibilityPage = lazy(() => import('@/components/storefront/DeviceCompatibilityPage').then((module) => ({ default: module.DeviceCompatibilityPage })));
const TermsPage = lazy(() => import('@/components/storefront/legal/TermsPage').then((module) => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('@/components/storefront/legal/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const EulaPage = lazy(() => import('@/components/storefront/legal/EulaPage').then((module) => ({ default: module.EulaPage })));
const RefundsPage = lazy(() => import('@/components/storefront/legal/RefundsPage').then((module) => ({ default: module.RefundsPage })));
const AcceptableUsePage = lazy(() => import('@/components/storefront/legal/AcceptableUsePage').then((module) => ({ default: module.AcceptableUsePage })));
const CopyrightPage = lazy(() => import('@/components/storefront/legal/CopyrightPage').then((module) => ({ default: module.CopyrightPage })));
const SupportPage = lazy(() => import('@/components/storefront/legal/SupportPage').then((module) => ({ default: module.SupportPage })));
const CookiesPage = lazy(() => import('@/components/storefront/legal/CookiesPage').then((module) => ({ default: module.CookiesPage })));
const LegalIndexPage = lazy(() => import('@/components/storefront/legal/LegalIndexPage').then((module) => ({ default: module.LegalIndexPage })));
const JournalIndexPage = lazy(() => import('@/components/storefront/JournalIndexPage').then((module) => ({ default: module.JournalIndexPage })));
const PhilosophyPage = lazy(() => import('@/components/storefront/PhilosophyPage').then((module) => ({ default: module.PhilosophyPage })));
const CollectionsIndexPage = lazy(() => import('@/components/storefront/CollectionsIndexPage').then((module) => ({ default: module.CollectionsIndexPage })));

export default function AppPublic() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b0f] text-[#e8d2a8] grid place-items-center">Preparing FlowVault…</div>}>
    <Routes>
      <Route path="/store" element={<Navigate to="/" replace />} />

      <Route
        element={
          <CatalogProvider>
            <StoreReadModelProvider><StorefrontLayout /></StoreReadModelProvider>
          </CatalogProvider>
        }
      >
        <Route index element={publicStoreArchitectureFlags.storefrontReadModel ? <DesignModelHomePage /> : <HomePage />} />
        <Route path="model/:slug" element={<ModelPage />} />
        <Route path="collections" element={<CollectionsIndexPage />} />
        <Route path="collection/:slug" element={<CollectionPage />} />
        <Route path="design/:slug" element={<DesignModelPage />} />
        <Route path="device/:slug" element={<DeviceCompatibilityPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="journal" element={<JournalIndexPage />} />
        <Route path="philosophy" element={<PhilosophyPage />} />
        <Route path="face/:id" element={publicStoreArchitectureFlags.storefrontReadModel ? <LegacyFaceResolver /> : <ProductPage />} />
        <Route path="legacy-face/:id" element={<ProductPage />} />
        <Route path="buy/:id" element={publicStoreArchitectureFlags.offerCheckout ? <OfferBuyPage /> : <BuyPage />} />
        <Route path="success/:id" element={<SuccessPage />} />
        <Route path="search" element={<SearchPage />} />
        {/* ── Legal pages ─────────────────────────────────────── */}
        <Route path="terms"          element={<TermsPage />} />
        <Route path="privacy"        element={<PrivacyPage />} />
        <Route path="eula"           element={<EulaPage />} />
        <Route path="refunds"        element={<RefundsPage />} />
        <Route path="acceptable-use" element={<AcceptableUsePage />} />
        <Route path="copyright"      element={<CopyrightPage />} />
        <Route path="support"        element={<SupportPage />} />
        <Route path="cookies"        element={<CookiesPage />} />
        <Route path="legal"          element={<LegalIndexPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

