import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="What cookies we use, why, and how you can control them."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. What Are Cookies">
        <LegalTodo id="cookies.what" />
      </LegalSection>
      <LegalSection heading="2. Cookies We Use">
        <LegalTodo id="cookies.list" />
        {/* TODO: Table of: cookie name, purpose, duration, first/third party */}
        {/* Categories: Strictly Necessary, Analytics, Functional, Marketing */}
      </LegalSection>
      <LegalSection heading="3. Strictly Necessary Cookies">
        <LegalTodo id="cookies.necessary" />
        {/* TODO: Session, auth, purchase flow */}
      </LegalSection>
      <LegalSection heading="4. Analytics Cookies">
        <LegalTodo id="cookies.analytics" />
        {/* TODO: Google Analytics / similar — require consent */}
      </LegalSection>
      <LegalSection heading="5. Managing Your Preferences">
        <LegalTodo id="cookies.preferences" />
        {/* TODO: Link to cookie consent banner / settings. Browser opt-out instructions. */}
      </LegalSection>
      <LegalSection heading="6. Third-Party Cookies">
        <LegalTodo id="cookies.third-party" />
        {/* TODO: Paddle, PayPal payment iframes */}
      </LegalSection>
      <LegalSection heading="7. Changes to This Policy">
        <LegalTodo id="cookies.changes" />
      </LegalSection>
    </LegalLayout>
  );
}
