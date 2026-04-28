# Hypothesis Test Matrix

| Hypothesis | Issue | Test Definition | Confirm Criteria | Refute Criteria | Threshold Inputs | Outcome Status | Evidence Refs |
|------------|-------|-----------------|------------------|-----------------|------------------|----------------|---------------|
| H1-1 | engrave | Compare edge-density/coverage delta between preview/export and device for fixed fixture runs | Device delta exceeds tolerance in at least 4/5 runs | Device delta remains within tolerance in at least 4/5 runs | runs>=5, tolerance=<define> | inconclusive | |
| H1-2 | engrave | Compare mismatch severity across low/medium/high complexity fixtures | High complexity mismatch materially higher than low complexity | No meaningful variance by complexity class | class spread low/med/high | inconclusive | |
| H1-3 | engrave | Compare severity by launch condition and transition phase | One or more conditions repeatedly higher than baseline | Severity stable across all conditions | fresh/resume/repeated_cycle | inconclusive | |
| H2-1 | pointer | Correlate valid extracted references with on-device render presence | Missing/partial device render with valid extracted references across repeated runs | Device failures only when extracted references invalid | runs>=10 per pattern | inconclusive | |
| H2-2 | pointer | Evaluate failure rate by hand-pack permutation | One or more permutations exceed failure threshold while others stable | Uniform low failure across permutations | permutations: H+M+S+Cover, H+M+S, H+M+Cover, H+M | inconclusive | |
| H2-3 | pointer | Track visibility at startup, resume, and controlled time transition | Disappearance clusters around specific transitions with repeatability | Visibility stable across transitions | transition coverage complete | inconclusive | |
