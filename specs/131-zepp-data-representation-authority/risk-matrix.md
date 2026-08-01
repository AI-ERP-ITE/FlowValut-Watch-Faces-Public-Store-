# Risk and Priority Matrix

## Priority definitions

| Priority | Meaning |
|---|---|
| P0 Must fix | Existing generated output can be wrong, invalid, or misleading |
| P1 Must have | Required to complete the approved architecture safely |
| P2 Nice to have | Valuable extension that can wait without corrupting existing output |
| Gate | Evidence is required before implementation is allowed |

## Feature risks

| Item | Priority | User impact | Change risk | Verdict and control |
|---|---|---|---|---|
| Authoritative weather 0–28 manifest | P0 | Wrong icon can appear for the real condition | Medium | Add golden manifest tests first; then change labels, built-ins, preview, and export together |
| Remove generated `data_type.WEATHER` | P0 | Invalid/unreliable watch binding | High | Characterize a generated ZPK, implement sensor-index adapter, test on watch before migration |
| Remove Temperature from Image Switcher | P0 | Duplicate/confusing choice and wrong assets | Medium | Migrate only 29-icon legacy elements to Weather Condition; preserve assets |
| Temperature minus/degree assets and fit | P0 | Negative/Fahrenheit values clip or omit unit | Medium | Reuse digit pipeline; add symbol fixtures and `-000°` safe-fit tests |
| Training Load removal from Arc | P0 | Progress has an invented maximum | Low/Medium | Hide for new elements; migrate existing arcs through warning rather than silent deletion |
| Range-switcher runtime parity | P0 | Preview can show one image while watch shows another | High | Add end-to-end threshold fixtures before enabling/retaining range switchers |
| Central descriptor authority | P1 | Prevents future contradictions | Medium/High | Introduce additively, compare against legacy tables, switch consumers one at a time |
| Humidity complete support | P1 | `%`, range images, Arc/Gauge need parity | Medium | Lock 0–100 and boundary-test 0/30/31/60/61/100 |
| Wind Level correction | P1 | Current preview says 888 instead of legal 0–12 | Low/Medium | Correct label/fit; add Gauge only after 0–12 parity test |
| Time Readings Digital | P1 | Sunrise/sunset are misplaced today | Medium/High | New isolated element/source model; do not alter current clock widgets |
| BioCharge 0–100 representations | P1, completed T020–T022; device verification pending T026 | Requested major data source | High | Uses community-proven `BIO_CHARGE`, compatibility warning, fixed 0–100 normalization, and explicit-range Switcher expansion; verify on supported hardware before deployment |
| FVWF migrations | P1 | Existing projects must remain usable | High | Versioned, idempotent migration tests with asset-preservation fixtures |
| Main/System B parity | Deferred | One editor could generate different output | High | Do not mix System B into System A tasks; synchronize and test it in a later dedicated stage |
| Moon runtime correction | Closed, no change | Fixed 7/13/30 behavior is retained | High if changed | T023 characterized and regression-locked the current adapter; user directed preservation, so reopen only for concrete watch/package evidence |
| Canonical PAI/Fat Burning identifiers | Completed T025A | New output uses official constants; legacy files remain readable | Low residual | Narrow alias/FVWF/generator migration and asset-preservation fixtures pass |
| Air Pressure mislabeled Altitude | Completed T025B | Existing source now communicates the correct measurement | Low residual | Runtime key/assets unchanged; official 1–1200 fit and semantics tested; `ALTITUDE` remains unavailable |
| Legacy configurable switcher thresholds | Completed T025C | Unsafe types are no longer offered for new switchers; old work remains readable | Medium residual for existing faces | Visible legacy warning, asset-preserving edit gate, and safe four-type creation inventory |
| Sleep duration classification | Completed T025D | New scalar misuse is blocked; legacy remains readable | Low residual | Future dedicated duration contract; never mix with Sunrise/Sunset time-of-day |
| Target/user-dependent bounded visuals | Completed T025D gate | New Steps/Calories/Heart/Distance Arc/Gauge misuse is blocked | Low residual | Preserve warned legacy elements; reopen only with target/scale evidence |
| Distance decimal pipeline | Completed T025D | Numeric distance can render its decimal separator | Low | Scoped PNG generation, `dont_path`, and strict missing-asset validation |
| SpO₂ and AQI authority | Completed T025D | Correct domains and regional warning reach editor/FVWF | Low | SpO₂ 51–100; AQI 1–999 plus mainland-China warning |
| Analog Time Readings | P2 | Additional visualization only | High | Defer; requires source-to-angle runtime and pointer library integration |
| Wind 13-icon switcher | P2 | Optional visualization | Medium | Add only with a deliberate exact-code asset contract |
| Time Until Sun Event | P2 | Duration display | Medium | Create a future Duration Reading semantic class; do not mix with time-of-day |

## Release strategy

| Release slice | Contents | Ship decision |
|---|---|---|
| Slice A — Safety foundation | Golden tests, descriptor scaffolding, no behavior change | First and lowest operational risk |
| Slice B — Weather correctness | Official mapping, built-in/custom parity, runtime weather adapter | Must pass physical-watch test before production |
| Slice C — Numeric corrections | Temperature symbols/fit, humidity, wind fit, Training Load restrictions | Ship after FVWF migration tests |
| Slice D — Range parity | Humidity and BioCharge switcher thresholds | Ship only when preview and device use identical resolver |
| Slice E — Time Readings | Digital Sunrise/Sunset | Independent feature flag or isolated release |
| Slice F — BioCharge | Numeric, then Arc, Gauge, Switcher | Ship only after runtime identifier/API gate is proven |
| Slice G — Moon | Characterization only; no generator correction | Completed without deployment |

## Minimal safe release recommendation

The smallest high-value release is:

1. lock the official weather manifest;
2. repair Weather Condition runtime binding;
3. consolidate Current Temperature under Numeric Values with `-000°` assets;
4. remove Training Load from new Arc choices;
5. correct Wind Level fitting;
6. add migrations and regression tests.

Time Readings, BioCharge, range switcher expansion, and Moon generator changes
should remain separate approval-gated slices so the currently running solution
is not destabilized by one large release.
