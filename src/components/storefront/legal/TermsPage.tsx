import { TERMS_CONTENT } from '@/content/legal/terms';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="The legal agreement governing your use of FVWatchFaces and Flow Vault products."
      version="1.1"
      lastUpdated="August 9, 2026"
      content={TERMS_CONTENT}
    >
      <LegalMarkdown content={TERMS_CONTENT} />
    </LegalLayout>
  );
}
