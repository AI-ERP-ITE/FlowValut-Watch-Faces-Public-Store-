import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'FVWatchFaces';
const BASE_URL = 'https://www.fvwatchfaces.com';

interface LegalMetaTagsProps {
  title: string;
  description: string;
  path: string;
}

/**
 * Injects per-page SEO metadata for legal pages via react-helmet-async.
 * Covers: title, meta description, canonical, OG, Twitter card.
 */
export function LegalMetaTags({ title, description, path }: LegalMetaTagsProps) {
  const fullTitle = `${title} — ${SITE_NAME}`;
  const canonical = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
