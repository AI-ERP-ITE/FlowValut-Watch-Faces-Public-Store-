import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import StudioApp from './StudioApp';
import LabPage from './LabPage';
import { CatalogProvider } from '@/context/CatalogContext';
import { StorefrontLayout } from '@/components/storefront/StorefrontLayout';
import { HomePage } from '@/components/storefront/HomePage';
import { ModelPage } from '@/components/storefront/ModelPage';
import { CategoryPage } from '@/components/storefront/CategoryPage';
import { ProductPage } from '@/components/storefront/ProductPage';
import { SearchPage } from '@/components/storefront/SearchPage';
import { BuyPage } from '@/components/storefront/BuyPage';
import { SuccessPage } from '@/components/storefront/SuccessPage';
import { AdminOpsPage } from '@/components/storefront/AdminOpsPage';
import {
  getCurrentAuthUser,
  isFirebaseAuthConfigured,
  subscribeAuthState,
} from '@/lib/firebaseAuthClient';

function PrivateRouteGuard({ children }: { children: ReactNode }) {
  const authConfigured = isFirebaseAuthConfigured();
  const [hasUser, setHasUser] = useState(() => !!getCurrentAuthUser());

  useEffect(() => {
    if (!authConfigured) return;
    return subscribeAuthState((user) => setHasUser(!!user));
  }, [authConfigured]);

  if (authConfigured && !hasUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function AppPrivate() {
  return (
    <Routes>
      <Route
        path="/studio"
        element={
          <PrivateRouteGuard>
            <StudioApp />
          </PrivateRouteGuard>
        }
      />
      <Route
        path="/studio/lab"
        element={
          <PrivateRouteGuard>
            <LabPage />
          </PrivateRouteGuard>
        }
      />

      <Route
        element={
          <CatalogProvider>
            <StorefrontLayout />
          </CatalogProvider>
        }
      >
        <Route path="/store" element={<Navigate to="/" replace />} />
        <Route index element={<HomePage />} />
        <Route path="model/:slug" element={<ModelPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="face/:id" element={<ProductPage />} />
        <Route path="buy/:id" element={<BuyPage />} />
        <Route path="success/:id" element={<SuccessPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route
          path="admin"
          element={
            <PrivateRouteGuard>
              <AdminOpsPage />
            </PrivateRouteGuard>
          }
        />
        <Route
          path="tools"
          element={
            <PrivateRouteGuard>
              <AdminOpsPage />
            </PrivateRouteGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

    </Routes>
  );
}
