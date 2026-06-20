import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Please read these terms carefully before using Flowvault or purchasing any watchface."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Acceptance of Terms">
        <LegalTodo id="terms.acceptance" />
      </LegalSection>
      <LegalSection heading="2. Description of Service">
        <LegalTodo id="terms.service-description" />
      </LegalSection>
      <LegalSection heading="3. User Accounts">
        <LegalTodo id="terms.accounts" />
        {/* TODO: Expand when user account registration is implemented */}
      </LegalSection>
      <LegalSection heading="4. Purchases and Payments">
        <LegalTodo id="terms.purchases" />
      </LegalSection>
      <LegalSection heading="5. License Grant">
        <LegalTodo id="terms.license" />
        {/* TODO: Reference EULA page once published */}
      </LegalSection>
      <LegalSection heading="6. Intellectual Property">
        <LegalTodo id="terms.ip" />
      </LegalSection>
      <LegalSection heading="7. Prohibited Conduct">
        <LegalTodo id="terms.prohibited" />
        {/* TODO: Cross-reference /acceptable-use */}
      </LegalSection>
      <LegalSection heading="8. Creator Marketplace">
        <LegalTodo id="terms.marketplace" />
        {/* TODO: Expand when creator marketplace is launched */}
      </LegalSection>
      <LegalSection heading="9. Subscription Plans">
        <LegalTodo id="terms.subscriptions" />
        {/* TODO: Expand when subscription system is launched */}
      </LegalSection>
      <LegalSection heading="10. API and Enterprise Licensing">
        <LegalTodo id="terms.api-enterprise" />
        {/* TODO: Expand when API / enterprise licensing is launched */}
      </LegalSection>
      <LegalSection heading="11. Disclaimer of Warranties">
        <LegalTodo id="terms.disclaimer" />
      </LegalSection>
      <LegalSection heading="12. Limitation of Liability">
        <LegalTodo id="terms.liability" />
      </LegalSection>
      <LegalSection heading="13. Governing Law">
        <LegalTodo id="terms.governing-law" />
      </LegalSection>
      <LegalSection heading="14. Changes to Terms">
        <LegalTodo id="terms.changes" />
      </LegalSection>
      <LegalSection heading="15. Contact">
        <LegalTodo id="terms.contact" />
      </LegalSection>
    </LegalLayout>
  );
}
