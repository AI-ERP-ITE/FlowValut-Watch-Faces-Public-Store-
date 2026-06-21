import { COPYRIGHT_CONTENT } from '@/content/legal/copyright';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function CopyrightPage() {
  return (
    <LegalLayout
      title="Copyright & Intellectual Property Policy"
      description="IP rights, AI training prohibition, DMCA notices, and infringement reporting."
      content={COPYRIGHT_CONTENT}
    >
      <LegalMarkdown content={COPYRIGHT_CONTENT} />
    </LegalLayout>
  );
}
