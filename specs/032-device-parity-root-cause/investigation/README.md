# Investigation Workspace Map

Feature: 032-device-parity-root-cause
Scope: Investigation-only artifacts for parity reproduction, matrix validation, and root-cause logging.

## Directory Conventions

- evidence/preview/: Preview-stage screenshots and notes.
- evidence/export/: Export-stage screenshots and build metadata captures.
- evidence/device/: On-device screenshots and videos.
- evidence/extracted/: Extracted package snapshots and script outputs.
- templates/: Canonical templates for run logs, matrix CSV, and evidence pack manifest.

## Naming Rules

- Run ID: run-YYYYMMDD-HHMMSS-<operator>
- Evidence ID: EV-<stage>-<run>-<nnn>
- Matrix row ID: MX-<issue>-<fixture>-<device>-<nnn>

## Required Artifact Outputs Per Run

- Preview evidence pair (before/after) with IDs.
- Export evidence pair (before/after) with IDs.
- Extracted package checks for app.json and watchface/index.js.
- Asset manifest check output.
- Device evidence (screenshot/video) tied to matrix rows.

## Capture-Only Rule

All investigation instrumentation is observational only. Generated ZPK/app artifacts must not be modified by instrumentation code paths.
