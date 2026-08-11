import { PRIVACY_CONTENT } from '@/content/legal/privacy';
import { LegalLayout } from './LegalLayout';
import { LegalMarkdown } from './LegalMarkdown';

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How Flow Vault collects, uses and protects your personal data."
      version="1.1"
      lastUpdated="August 9, 2026"
      content={PRIVACY_CONTENT}
    >
      <LegalMarkdown content={PRIVACY_CONTENT} />
    </LegalLayout>
  );
}
