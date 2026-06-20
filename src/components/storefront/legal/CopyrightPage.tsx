import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function CopyrightPage() {
  return (
    <LegalLayout
      title="Copyright Policy"
      subtitle="Intellectual property rights, DMCA notices, and reporting infringement."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Ownership of Content">
        <LegalTodo id="copyright.ownership" />
      </LegalSection>
      <LegalSection heading="2. License to Users">
        <LegalTodo id="copyright.license" />
        {/* TODO: Cross-reference /eula */}
      </LegalSection>
      <LegalSection heading="3. Third-Party Assets">
        <LegalTodo id="copyright.third-party" />
        {/* TODO: Fonts, icons, device imagery */}
      </LegalSection>
      <LegalSection heading="4. DMCA / Copyright Infringement Notice">
        <LegalTodo id="copyright.dmca" />
        {/* TODO: Include DMCA contact address and required notice elements */}
      </LegalSection>
      <LegalSection heading="5. Counter-Notice Procedure">
        <LegalTodo id="copyright.counter-notice" />
      </LegalSection>
      <LegalSection heading="6. Repeat Infringer Policy">
        <LegalTodo id="copyright.repeat-infringer" />
      </LegalSection>
      <LegalSection heading="7. Creator Marketplace IP">
        <LegalTodo id="copyright.marketplace-ip" />
        {/* TODO: Expand when creator marketplace is launched */}
      </LegalSection>
      <LegalSection heading="8. Trademark">
        <LegalTodo id="copyright.trademark" />
      </LegalSection>
      <LegalSection heading="9. How to Report">
        <LegalTodo id="copyright.report" />
        {/* TODO: Email, form, or /support cross-reference */}
      </LegalSection>
    </LegalLayout>
  );
}
