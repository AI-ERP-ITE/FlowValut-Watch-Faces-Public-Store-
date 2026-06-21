export { TERMS_CONTENT } from './terms';
export { PRIVACY_CONTENT } from './privacy';
export { COOKIES_CONTENT } from './cookies';
export { EULA_CONTENT } from './eula';
export { REFUNDS_CONTENT } from './refunds';
export { ACCEPTABLE_USE_CONTENT } from './acceptable-use';
export { COPYRIGHT_CONTENT } from './copyright';
export { SUPPORT_CONTENT } from './support';
export { LEGAL_NOTICES_CONTENT } from './legal-notices';

import { TERMS_CONTENT } from './terms';
import { PRIVACY_CONTENT } from './privacy';
import { COOKIES_CONTENT } from './cookies';
import { EULA_CONTENT } from './eula';
import { REFUNDS_CONTENT } from './refunds';
import { ACCEPTABLE_USE_CONTENT } from './acceptable-use';
import { COPYRIGHT_CONTENT } from './copyright';
import { SUPPORT_CONTENT } from './support';
import { LEGAL_NOTICES_CONTENT } from './legal-notices';

/** Flat index for future search integration */
export const LEGAL_INDEX = [
  { route: '/terms',          title: 'Terms of Service',                        content: TERMS_CONTENT },
  { route: '/privacy',        title: 'Privacy Policy',                          content: PRIVACY_CONTENT },
  { route: '/cookies',        title: 'Cookie Policy',                           content: COOKIES_CONTENT },
  { route: '/eula',           title: 'End User License Agreement',              content: EULA_CONTENT },
  { route: '/refunds',        title: 'Refund Policy',                           content: REFUNDS_CONTENT },
  { route: '/acceptable-use', title: 'Acceptable Use Policy',                   content: ACCEPTABLE_USE_CONTENT },
  { route: '/copyright',      title: 'Copyright & Intellectual Property Policy',content: COPYRIGHT_CONTENT },
  { route: '/support',        title: 'Support Policy',                          content: SUPPORT_CONTENT },
  { route: '/legal',          title: 'Legal Notices',                           content: LEGAL_NOTICES_CONTENT },
];
