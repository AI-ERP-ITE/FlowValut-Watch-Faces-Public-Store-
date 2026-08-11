/** Public-only feature contract. Creator and Workshop flags must never be
 * imported by AppPublic or its dependency graph. */
export interface PublicStoreArchitectureFlags {
  storefrontReadModel: boolean;
  offerCheckout: boolean;
}

function flagEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function resolvePublicStoreArchitectureFlags(
  env: Record<string, string | undefined>,
): PublicStoreArchitectureFlags {
  return {
    storefrontReadModel: flagEnabled(env.VITE_STORE_READ_MODEL_ENABLED),
    offerCheckout: flagEnabled(env.VITE_STORE_OFFER_CHECKOUT_ENABLED),
  };
}

export const publicStoreArchitectureFlags = resolvePublicStoreArchitectureFlags(import.meta.env);

