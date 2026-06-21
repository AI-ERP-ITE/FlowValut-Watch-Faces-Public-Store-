import { EULA_CONTENT } from '@/content/legal/eula';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function EulaPage() {
  return (
    <LegalLayout
      title="End User License Agreement"
      description="Your rights and restrictions when using FVWatchFaces digital assets."
      content={EULA_CONTENT}
    >
      <LegalMarkdown content={EULA_CONTENT} />
    </LegalLayout>
  );
}
