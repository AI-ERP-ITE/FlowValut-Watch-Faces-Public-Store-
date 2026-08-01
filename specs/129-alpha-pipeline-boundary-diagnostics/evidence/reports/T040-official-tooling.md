# T040 — Official Zepp tooling discovery

**Result:** PASS

No Zepp CLI, simulator, editor, bridge, or global Zepp npm package was initially
installed. The official `@zeppos/zeus-cli` was installed only beneath Spec 129.

Validated versions:

- Node 22.16.0
- npm 10.9.2
- Zeus CLI 1.9.3
- ZPM 3.4.2

The published CLI package contains a broken local `zeppos-app-utils` dependency
mapping. A test-environment-only module alias was supplied to make the official
CLI executable. No application dependencies or production files were changed.

The current official device registry rejected the legacy GTR 3 Pro target for
this v2 build path, so the official 480×480 Amazfit Balance profile
(`deviceSource` 8519937) was used.

