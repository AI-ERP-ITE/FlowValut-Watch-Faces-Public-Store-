# 01 - Plan

## Objective
Implement a complete mask painting fix using direct scalar field editing, with no fake alpha floors, no gray hide tones, and no mask weakening.

## Constraints
1. No fake alpha floor.
2. No gray hide tone workaround.
3. Hide can still reach exact 0.
4. Reveal can still reach exact 1.
5. Apply mask alpha once at final render.

## Execution Mode
1. Single-task execution only.
2. No stacked task execution.
3. After each task: evidence + approval gate.

## Phases
1. Baseline math and root-cause proof.
2. Field model design.
3. Engine implementation.
4. Validation suite.
5. Deploy + live verification.
