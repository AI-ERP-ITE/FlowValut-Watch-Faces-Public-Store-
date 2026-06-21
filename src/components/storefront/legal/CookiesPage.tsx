import { COOKIES_CONTENT } from '@/content/legal/cookies';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      description="What cookies we use, why, and how you can control them."
      content={COOKIES_CONTENT}
    >
      <LegalMarkdown content={COOKIES_CONTENT} />
    </LegalLayout>
  );
}
