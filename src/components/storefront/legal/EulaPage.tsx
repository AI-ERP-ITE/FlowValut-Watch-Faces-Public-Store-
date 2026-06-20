import { LegalLayout, LegalSection, LegalTodo } from './LegalLayout';

export function EulaPage() {
  return (
    <LegalLayout
      title="End User License Agreement"
      subtitle="Your rights and restrictions when using Flowvault watchfaces on your device."
      lastUpdated="[DATE PENDING]"
    >
      <LegalSection heading="1. Grant of License">
        <LegalTodo id="eula.grant" />
        {/* TODO: Personal, non-commercial, single-device license */}
      </LegalSection>
      <LegalSection heading="2. Permitted Uses">
        <LegalTodo id="eula.permitted" />
      </LegalSection>
      <LegalSection heading="3. Restrictions">
        <LegalTodo id="eula.restrictions" />
        {/* TODO: No redistribution, resale, reverse engineering, modification for commercial purposes */}
      </LegalSection>
      <LegalSection heading="4. Ownership">
        <LegalTodo id="eula.ownership" />
      </LegalSection>
      <LegalSection heading="5. Free vs Paid Watchfaces">
        <LegalTodo id="eula.free-vs-paid" />
      </LegalSection>
      <LegalSection heading="6. Updates and Compatibility">
        <LegalTodo id="eula.updates" />
        {/* TODO: Zepp OS version compatibility, no guarantee of future updates */}
      </LegalSection>
      <LegalSection heading="7. Termination">
        <LegalTodo id="eula.termination" />
      </LegalSection>
      <LegalSection heading="8. Mobile and Desktop Applications">
        <LegalTodo id="eula.apps" />
        {/* TODO: Expand when companion apps are released */}
      </LegalSection>
      <LegalSection heading="9. Plugins and APIs">
        <LegalTodo id="eula.plugins-api" />
        {/* TODO: Expand when plugin/API system is launched */}
      </LegalSection>
      <LegalSection heading="10. Disclaimer">
        <LegalTodo id="eula.disclaimer" />
      </LegalSection>
    </LegalLayout>
  );
}
