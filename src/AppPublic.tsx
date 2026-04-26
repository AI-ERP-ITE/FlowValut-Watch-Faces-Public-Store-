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

export default function AppPublic() {
  return (
    <Routes>
      <Route path="/store" element={<Navigate to="/" replace />} />

      <Route
        element={
          <CatalogProvider>
            <StorefrontLayout />
          </CatalogProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="model/:slug" element={<ModelPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="face/:id" element={<ProductPage />} />
        <Route path="buy/:id" element={<BuyPage />} />
        <Route path="success/:id" element={<SuccessPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
