import { REFUNDS_CONTENT } from '@/content/legal/refunds';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function RefundsPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      description="Our commitment to fair and transparent refunds for digital products."
      version="1.1"
      lastUpdated="August 9, 2026"
      content={REFUNDS_CONTENT}
    >
      <LegalMarkdown content={REFUNDS_CONTENT} />
    </LegalLayout>
  );
}
