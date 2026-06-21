import { TERMS_CONTENT } from '@/content/legal/terms';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="The legal agreement governing your use of FVWatchFaces and Flow Vault products."
      content={TERMS_CONTENT}
    >
      <LegalMarkdown content={TERMS_CONTENT} />
    </LegalLayout>
  );
}
