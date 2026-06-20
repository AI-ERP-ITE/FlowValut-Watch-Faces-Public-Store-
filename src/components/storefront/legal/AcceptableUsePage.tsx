import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function AcceptableUsePage() {
  return (
    <LegalLayout
      title="Acceptable Use Policy"
      subtitle="What you may and may not do with Flowvault products and services."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Overview">
        <LegalTodo id="aup.overview" />
      </LegalSection>
      <LegalSection heading="2. Permitted Uses">
        <LegalTodo id="aup.permitted" />
      </LegalSection>
      <LegalSection heading="3. Prohibited Uses">
        <LegalTodo id="aup.prohibited" />
        {/* TODO: Redistribution, commercial resale, scraping, circumventing DRM */}
      </LegalSection>
      <LegalSection heading="4. Creator Marketplace Conduct">
        <LegalTodo id="aup.marketplace" />
        {/* TODO: Expand when creator marketplace is launched */}
      </LegalSection>
      <LegalSection heading="5. AI Tool Usage">
        <LegalTodo id="aup.ai" />
        {/* TODO: Expand when AI tools are launched */}
      </LegalSection>
      <LegalSection heading="6. API Usage">
        <LegalTodo id="aup.api" />
        {/* TODO: Rate limits, authentication requirements, prohibited API use */}
      </LegalSection>
      <LegalSection heading="7. Enforcement">
        <LegalTodo id="aup.enforcement" />
      </LegalSection>
      <LegalSection heading="8. Reporting Violations">
        <LegalTodo id="aup.reporting" />
        {/* TODO: Cross-reference /support */}
      </LegalSection>
    </LegalLayout>
  );
}
