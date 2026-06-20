import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How Flowvault collects, uses and protects your personal data."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Data Controller">
        <LegalTodo id="privacy.controller" />
      </LegalSection>
      <LegalSection heading="2. Data We Collect">
        <LegalTodo id="privacy.data-collected" />
        {/* TODO: Include: email, payment data, download history, device info, analytics */}
      </LegalSection>
      <LegalSection heading="3. How We Use Your Data">
        <LegalTodo id="privacy.use" />
      </LegalSection>
      <LegalSection heading="4. Legal Basis for Processing (GDPR)">
        <LegalTodo id="privacy.legal-basis" />
      </LegalSection>
      <LegalSection heading="5. Cookies and Tracking">
        <LegalTodo id="privacy.cookies" />
        {/* TODO: Cross-reference /cookies */}
      </LegalSection>
      <LegalSection heading="6. Third-Party Services">
        <LegalTodo id="privacy.third-parties" />
        {/* TODO: List: Paddle, PayPal, Firebase, GitHub Pages, Google Analytics */}
      </LegalSection>
      <LegalSection heading="7. Data Retention">
        <LegalTodo id="privacy.retention" />
      </LegalSection>
      <LegalSection heading="8. Your Rights">
        <LegalTodo id="privacy.rights" />
        {/* TODO: GDPR rights: access, rectification, erasure, portability, objection */}
      </LegalSection>
      <LegalSection heading="9. International Transfers">
        <LegalTodo id="privacy.transfers" />
      </LegalSection>
      <LegalSection heading="10. Children's Privacy">
        <LegalTodo id="privacy.children" />
      </LegalSection>
      <LegalSection heading="11. Future: User Accounts and AI Tools">
        <LegalTodo id="privacy.future-accounts-ai" />
        {/* TODO: Expand when accounts + AI usage tracking is added */}
      </LegalSection>
      <LegalSection heading="12. Contact / Data Protection Officer">
        <LegalTodo id="privacy.contact" />
      </LegalSection>
    </LegalLayout>
  );
}
