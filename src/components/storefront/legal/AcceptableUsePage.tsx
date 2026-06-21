import { ACCEPTABLE_USE_CONTENT } from '@/content/legal/acceptable-use';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function AcceptableUsePage() {
  return (
    <LegalLayout
      title="Acceptable Use Policy"
      description="What you may and may not do with FVWatchFaces products and services."
      content={ACCEPTABLE_USE_CONTENT}
    >
      <LegalMarkdown content={ACCEPTABLE_USE_CONTENT} />
    </LegalLayout>
  );
}
