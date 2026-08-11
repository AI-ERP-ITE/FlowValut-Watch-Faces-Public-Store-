import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(appRoot, 'dist');
const target = process.argv.find((value) => value.startsWith('--target='))?.split('=')[1];
if (target !== 'staging' && target !== 'production') throw new Error('Use --target=staging or --target=production');

const origin = target === 'production' ? 'https://www.fvwatchfaces.com' : 'https://flowvault-staging-2026.web.app';
const functionsOrigin = target === 'production'
  ? 'https://us-central1-zeppfaceloader-b0b106e9.cloudfunctions.net'
  : 'https://us-central1-flowvault-staging-2026.cloudfunctions.net';
const response = await fetch(`${functionsOrigin}/publicStoreHierarchy`, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`SEO hierarchy fetch failed (${response.status})`);
const model = await response.json();
for (const key of ['collections', 'designModels', 'skus', 'technicalPackages', 'offers', 'devices']) {
  if (!Array.isArray(model[key])) throw new Error(`SEO hierarchy is missing ${key}`);
}

const template = readFileSync(path.join(distRoot, 'index.html'), 'utf8');
const legacyModels = JSON.parse(readFileSync(path.join(appRoot, 'models.json'), 'utf8'));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const unique = (values) => [...new Set(values.filter(Boolean))];
const routes = [];

function addRoute(route, { title, description, image, content, structuredData }) {
  const normalized = route === '/' ? '/' : `/${route.replace(/^\/+|\/+$/g, '')}`;
  const canonical = `${origin}${normalized}`;
  const meta = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="FlowVault" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    structuredData ? `<script type="application/ld+json">${safeJson(structuredData)}</script>` : '',
  ].filter(Boolean).join('\n    ');
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace('</head>', `    ${meta}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(content || description)}</p></main></div>`);
  const output = normalized === '/' ? path.join(distRoot, 'index.html') : path.join(distRoot, normalized.slice(1), 'index.html');
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, html, 'utf8');
  routes.push(normalized);
}

addRoute('/', {
  title: 'FlowVault — Premium Amazfit Watch Faces',
  description: 'Discover premium FlowVault watch faces crafted for compatible Amazfit and Zepp OS watches.',
  content: 'Premium apps, smart software, and timeless watch-face design for compatible Amazfit watches.',
  structuredData: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'FlowVault', url: `${origin}/` },
});

for (const collection of model.collections) {
  const models = model.designModels.filter((item) => item.collectionId === collection.id);
  addRoute(`collection/${collection.slug}`, {
    title: `${collection.name} Collection — FlowVault`,
    description: collection.description || `Explore ${collection.name}, a premium FlowVault watch-face collection.`,
    content: models.map((item) => item.name).join(', '),
  });
}

for (const design of model.designModels) {
  const skus = model.skus.filter((item) => item.productModelId === design.id);
  const packages = model.technicalPackages.filter((item) => skus.some((sku) => sku.id === item.skuId));
  const offers = model.offers.filter((item) => item.includedSkuIds.some((skuId) => skus.some((sku) => sku.id === skuId)));
  const price = offers.length ? Math.min(...offers.map((offer) => Number(offer.campaignPrice ?? offer.regularPrice))) : undefined;
  const image = packages.find((item) => item.mainPreviewPath)?.mainPreviewPath;
  addRoute(`design/${design.slug}`, {
    title: `${design.name} — FlowVault`,
    description: design.description || design.designStory || `Explore ${design.name} variants and compatible Amazfit watch packages.`,
    image,
    content: skus.map((item) => item.canonicalName).join(', '),
    structuredData: {
      '@context': 'https://schema.org', '@type': 'Product', name: design.name,
      description: design.description || design.designStory || `${design.name} by FlowVault`,
      ...(image ? { image } : {}), brand: { '@type': 'Brand', name: 'FlowVault' },
      ...(price !== undefined ? { offers: { '@type': 'Offer', priceCurrency: 'USD', price: price.toFixed(2), availability: 'https://schema.org/InStock', url: `${origin}/design/${design.slug}` } } : {}),
    },
  });
}

for (const device of model.devices) {
  addRoute(`device/${device.id}`, {
    title: `${device.name} Compatible Watch Faces — FlowVault`,
    description: `Browse FlowVault watch faces compatible with ${device.brand || 'Amazfit'} ${device.name}.`,
  });
}

for (const [slug, legacyModel] of Object.entries(legacyModels)) {
  addRoute(`model/${slug}`, {
    title: `${legacyModel.name} Watch Faces â€” FlowVault`,
    description: `Browse FlowVault watch faces compatible with ${legacyModel.name}.`,
  });
}

for (const category of unique(model.designModels.flatMap((item) => item.categories || []))) {
  addRoute(`category/${encodeURIComponent(String(category).toLowerCase().replace(/\s+/g, '-'))}`, {
    title: `${category} Watch Faces — FlowVault`,
    description: `Explore premium ${category} watch faces from FlowVault.`,
  });
}

for (const offer of model.offers) {
  const sku = model.skus.find((item) => offer.includedSkuIds.includes(item.id));
  const pkg = model.technicalPackages.find((item) => item.skuId === sku?.id && item.mainPreviewPath);
  addRoute(`buy/${offer.id}`, {
    title: `${offer.name} — Secure Checkout — FlowVault`,
    description: `Select a compatible Amazfit model and securely purchase ${offer.name} from FlowVault.`,
    image: pkg?.mainPreviewPath,
  });
}

const staticRoutes = [
  ['search', 'Search FlowVault', 'Search premium FlowVault watch faces.'],
  ['terms', 'Terms and Conditions — FlowVault', 'FlowVault terms and conditions.'],
  ['privacy', 'Privacy Policy — FlowVault', 'FlowVault privacy policy.'],
  ['cookies', 'Cookie Policy — FlowVault', 'FlowVault cookie policy.'],
  ['eula', 'End User License Agreement — FlowVault', 'FlowVault end user license agreement.'],
  ['refunds', 'Refund Policy — FlowVault', 'FlowVault refund policy.'],
  ['acceptable-use', 'Acceptable Use — FlowVault', 'FlowVault acceptable use policy.'],
  ['copyright', 'Copyright — FlowVault', 'FlowVault copyright policy.'],
  ['support', 'Customer Support — FlowVault', 'Get help with FlowVault purchases, downloads, and installation.'],
  ['legal', 'Legal Center — FlowVault', 'FlowVault legal policies and customer terms.'],
];
for (const [route, title, description] of staticRoutes) addRoute(route, { title, description });

const now = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique(routes).map((route) => `  <url><loc>${origin}${route}</loc><lastmod>${now}</lastmod></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(path.join(distRoot, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(path.join(distRoot, 'robots.txt'), target === 'production'
  ? `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n', 'utf8');
const notFound = template
  .replace(/<title>[^<]*<\/title>/, '<title>Page Not Found â€” FlowVault</title>')
  .replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>')
  .replace('<div id="root"></div>', '<main style="min-height:100vh;display:grid;place-items:center;background:#080a0e;color:#e1e4ea;font-family:Arial,sans-serif;text-align:center;padding:2rem"><section><h1>Page not found</h1><p>The FlowVault page you requested does not exist.</p><p><a href="/" style="color:#e8d2a8">Return to FlowVault</a></p></section></main>');
writeFileSync(path.join(distRoot, '404.html'), notFound, 'utf8');
console.log(`Generated ${unique(routes).length} SEO routes for ${target}.`);
