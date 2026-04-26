import { Routes, Route } from 'react-router-dom';
import StudioApp from './StudioApp';
import { CatalogProvider } from '@/context/CatalogContext';
import { StorefrontLayout } from '@/components/storefront/StorefrontLayout';
import { HomePage } from '@/components/storefront/HomePage';
import { ModelPage } from '@/components/storefront/ModelPage';
import { CategoryPage } from '@/components/storefront/CategoryPage';
import { ProductPage } from '@/components/storefront/ProductPage';
import { SearchPage } from '@/components/storefront/SearchPage';
import { BuyPage } from '@/components/storefront/BuyPage';
import { SuccessPage } from '@/components/storefront/SuccessPage';

function App() {
  return (
    <Routes>
      {/* Creator Studio — no catalog needed */}
      <Route path="/studio" element={<StudioApp />} />

      {/* Storefront — wrapped in CatalogProvider */}
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
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}

export default App;
