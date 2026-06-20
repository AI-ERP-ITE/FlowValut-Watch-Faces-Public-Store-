import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function SupportPage() {
  return (
    <LegalLayout
      title="Support Policy"
      subtitle="How to get help, our response commitments, and what we support."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Scope of Support">
        <LegalTodo id="support.scope" />
        {/* TODO: What is and isn't supported (device issues vs watchface issues) */}
      </LegalSection>
      <LegalSection heading="2. How to Contact Support">
        <LegalTodo id="support.contact" />
        {/* TODO: Add email / contact form link when ready */}
      </LegalSection>
      <LegalSection heading="3. Response Times">
        <LegalTodo id="support.response-times" />
      </LegalSection>
      <LegalSection heading="4. Supported Devices and Firmware">
        <LegalTodo id="support.devices" />
      </LegalSection>
      <LegalSection heading="5. Download Issues">
        <LegalTodo id="support.downloads" />
        {/* TODO: Regeneration link, token expiry, re-download instructions */}
      </LegalSection>
      <LegalSection heading="6. Refund Requests via Support">
        <LegalTodo id="support.refunds" />
        {/* TODO: Cross-reference /refunds */}
      </LegalSection>
      <LegalSection heading="7. Enterprise and API Support">
        <LegalTodo id="support.enterprise" />
        {/* TODO: Expand when enterprise / API tiers are launched */}
      </LegalSection>
      <LegalSection heading="8. Abuse and Security Reports">
        <LegalTodo id="support.abuse-security" />
        {/* TODO: Security disclosure / responsible disclosure policy */}
      </LegalSection>
    </LegalLayout>
  );
}
