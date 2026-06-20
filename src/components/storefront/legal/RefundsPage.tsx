import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function RefundsPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      subtitle="Our commitment to fair and transparent refunds."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Digital Products Policy">
        <LegalTodo id="refunds.digital" />
        {/* TODO: Digital goods are generally non-refundable once downloaded */}
      </LegalSection>
      <LegalSection heading="2. Eligibility for Refund">
        <LegalTodo id="refunds.eligibility" />
        {/* TODO: Defective file, wrong device/spec, non-delivery */}
      </LegalSection>
      <LegalSection heading="3. How to Request a Refund">
        <LegalTodo id="refunds.process" />
        {/* TODO: Cross-reference /support */}
      </LegalSection>
      <LegalSection heading="4. Timeframe">
        <LegalTodo id="refunds.timeframe" />
      </LegalSection>
      <LegalSection heading="5. Payment Processor Policies">
        <LegalTodo id="refunds.processors" />
        {/* TODO: Paddle and PayPal refund handling */}
      </LegalSection>
      <LegalSection heading="6. Subscriptions">
        <LegalTodo id="refunds.subscriptions" />
        {/* TODO: Expand when subscription system is launched */}
      </LegalSection>
      <LegalSection heading="7. Enterprise Licenses">
        <LegalTodo id="refunds.enterprise" />
        {/* TODO: Expand when enterprise licensing is launched */}
      </LegalSection>
      <LegalSection heading="8. Contact">
        <LegalTodo id="refunds.contact" />
      </LegalSection>
    </LegalLayout>
  );
}
