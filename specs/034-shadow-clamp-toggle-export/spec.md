# Feature Specification: Optional Shadow Clamp with Export Apply

**Feature Branch**: `[034-shadow-clamp-toggle-export]`  
**Created**: 2026-04-24  
**Status**: Draft

## Objective
Make shadow clamp optional via explicit toggle, and apply clamp to saved background output only when toggle is enabled.

## Requirements
- Add an explicit toggle for flickery-shadow erasure.
- Default toggle state is OFF (non-forced behavior).
- Preview flicker analysis uses clamped buffer only when toggle is ON.
- Save/export of background image applies clamp only when toggle is ON.
- Save/export remains unclamped when toggle is OFF.
- Keep existing flickerEngine logic unchanged.

## Validation
- Toggle OFF: preview and save/export are unclamped.
- Toggle ON: preview and save/export are clamped using selected threshold.
- Slider change and toggle change update preview/flicker results in real time.
