import { Navigate, Route, Routes } from 'react-router-dom';
import { CatalogProvider } from '@/context/CatalogContext';
import { StorefrontLayout } from '@/components/storefront/StorefrontLayout';
import { HomePage } from '@/components/storefront/HomePage';
import { ModelPage } from '@/components/storefront/ModelPage';
import { CategoryPage } from '@/components/storefront/CategoryPage';
import { ProductPage } from '@/components/storefront/ProductPage';
import { SearchPage } from '@/components/storefront/SearchPage';
import { BuyPage } from '@/components/storefront/BuyPage';
import { SuccessPage } from '@/components/storefront/SuccessPage';
import { TermsPage } from '@/components/storefront/legal/TermsPage';
import { PrivacyPage } from '@/components/storefront/legal/PrivacyPage';
import { EulaPage } from '@/components/storefront/legal/EulaPage';
import { RefundsPage } from '@/components/storefront/legal/RefundsPage';
import { AcceptableUsePage } from '@/components/storefront/legal/AcceptableUsePage';
import { CopyrightPage } from '@/components/storefront/legal/CopyrightPage';
import { SupportPage } from '@/components/storefront/legal/SupportPage';
import { CookiesPage } from '@/components/storefront/legal/CookiesPage';
import { LegalIndexPage } from '@/components/storefront/legal/LegalIndexPage';
import { StoreReadModelProvider } from '@/context/StoreReadModelContext';
import { storeArchitectureFlags } from '@/lib/storeArchitecture';
import { DesignModelHomePage } from '@/components/storefront/DesignModelHomePage';
import { CollectionPage } from '@/components/storefront/CollectionPage';
import { DesignModelPage, LegacyFaceResolver } from '@/components/storefront/DesignModelPage';
import { DeviceCompatibilityPage } from '@/components/storefront/DeviceCompatibilityPage';

export default function AppPublic() {
  return (
    <Routes>
      <Route path="/store" element={<Navigate to="/" replace />} />

      <Route
        element={
          <CatalogProvider>
            <StoreReadModelProvider><StorefrontLayout /></StoreReadModelProvider>
          </CatalogProvider>
        }
      >
        <Route index element={storeArchitectureFlags.storefrontReadModel ? <DesignModelHomePage /> : <HomePage />} />
        <Route path="model/:slug" element={<ModelPage />} />
        <Route path="collection/:slug" element={<CollectionPage />} />
        <Route path="design/:slug" element={<DesignModelPage />} />
        <Route path="device/:slug" element={<DeviceCompatibilityPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="face/:id" element={storeArchitectureFlags.storefrontReadModel ? <LegacyFaceResolver /> : <ProductPage />} />
        <Route path="legacy-face/:id" element={<ProductPage />} />
        <Route path="buy/:id" element={<BuyPage />} />
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
  );
}

