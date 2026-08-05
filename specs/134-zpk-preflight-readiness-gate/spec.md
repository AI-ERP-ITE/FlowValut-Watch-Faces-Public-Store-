# Spec 134 — ZPK Preflight Readiness Gate

**Status:** Approved for implementation  
**Created:** 2026-08-05  
**Domain:** Private Studio build workflow and preview sample values

## Goal

Place an explicit quality gate before every watch-test/ZPK build and make digital
preview values match the established face-design reference without changing the
analog-hand renderer.

## Contract

- Day/date previews use `31`.
- Digital hours, minutes, and seconds use `16`, `49`, and `15` respectively.
- Analog hand positions and their rendering logic remain unchanged.
- Every build attempt opens a fresh checklist requiring confirmation that AOD was
  updated, the face was inspected at watch size, pointer shadows were reviewed,
  the latest Time Pointer widget is in use, and the background was reviewed.
- Generation cannot start until every acknowledgement is checked.
- When visible widgets within the same face mode share both exact widget type and
  non-empty data type, the gate shows a warning. The user may explicitly accept
  it or return to revise.
- Canvas-only Shortcut Icon widgets are excluded from duplicate checks.
- Main and AOD are checked independently so legitimate AOD counterparts do not
  produce false warnings.

## Acceptance Criteria

1. Digital time and date previews show 16:49:15 and 31.
2. Analog behavior is byte-for-byte unaffected by this feature.
3. Build generation is unreachable until all checklist items are acknowledged.
4. Exact duplicate bindings are listed by mode and require explicit acceptance.
5. The gate resets on every build attempt.

