import { SUPPORT_CONTENT } from '@/content/legal/support';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function SupportPage() {
  return (
    <LegalLayout
      title="Support Policy"
      description="How to get help, our response commitments, and what we support."
      content={SUPPORT_CONTENT}
    >
      <LegalMarkdown content={SUPPORT_CONTENT} />
    </LegalLayout>
  );
}
