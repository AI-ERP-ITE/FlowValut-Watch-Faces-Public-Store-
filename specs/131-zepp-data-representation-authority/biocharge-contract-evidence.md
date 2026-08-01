# BioCharge Runtime Contract Evidence — T019

**Date:** 2026-08-01  
**Scope:** System A discovery only; no runtime implementation

## Initial public-documentation verdict

BioCharge is an official Amazfit product metric with a `0–100` score. The
public Zepp watch-face API does **not** publish `hmUI.data_type.BIO_CHARGE` (or a
similarly named constant). It publishes `hmUI.data_type.READINESS`, described as
“Physical and mental readiness,” also with range `[0, 100]`.

Those facts do not prove that BioCharge and Readiness use the same firmware
binding. Official older Balance material calls the metric **Readiness**, while
newer product material calls the dynamic energy metric **BioCharge**. Therefore
`READINESS` is a candidate identifier, not an approved BioCharge identifier.

That was the initial public-documentation result. A subsequent targeted internet
audit found Zepp OS community/editor runtime evidence for the exact identifier
`hmUI.data_type.BIO_CHARGE`; the no-underscore `BIOCHARGE` form fails. Watch
Face Editor v15.1 added a dedicated BioCharge widget, and compatibility reports
place it on supported newer firmware/API-level devices. On explicit user
approval, this reopened Numeric Values for T020, fixed-range Arc/Gauge for T021,
and explicit-range Image Switcher for T022.

## Evidence matrix

| Contract field | Proven evidence | T019 verdict |
|---|---|---|
| Product name | Current Amazfit support pages call the feature BioCharge | Proven |
| Value domain | Official support states score `0–100`, higher means more energy/recovery/readiness | Proven |
| Public watch-face identifier | Public registry contains `READINESS`; community/editor runtime evidence identifies `BIO_CHARGE` | `BIO_CHARGE` approved for numeric T020; not claimed as public documentation |
| `READINESS` range | Zepp watch-face `data_type` registry states `[0, 100]` | Proven for Readiness only |
| Numeric display | Watch-face design rules allow Readiness numbers, up to 3 characters (`000`) | Proven for Readiness only |
| Pointer/progress display | Design rules allow Readiness pointers and progress | Proven for Readiness only |
| Empty/invalid state | Readiness design rule specifies `--`; BioCharge calculation may stop when wear/data is insufficient | Display requirement known; firmware sentinel value not documented |
| Image switcher | No official BioCharge/Readiness image-level contract or slot mapping found | Unproven |
| API/version gate | Community compatibility reports place BioCharge around API level 4.2+ on supported models | Preserve a visible compatibility warning; universal matrix remains unproven |
| Supported devices | Official support confirms BioCharge on examples including T-Rex 3 Pro, Cheetah 2 Ultra, and Active Max | Feature is device-dependent; no universal watch-face support proven |
| Balance-family distinction | Official Balance material describes Readiness; Balance 2 public guide does not prove a BioCharge watch-face field | Do not alias by name or range |

## Widget-contract decision after follow-up evidence

T020/T021 use `hmUI.data_type.BIO_CHARGE` for Numeric, Arc, and Gauge with an
explicit compatibility warning. The known 0–100 domain supports:

1. Numeric digits: `0–100`, with an invalid `--` asset requirement.
2. Arc progress: fixed `0–100`.
3. Gauge pointer: fixed `0–100`, with invalid visibility explicitly decided.

Image Switcher does not assume undocumented automatic frame scaling. T022 uses
the solution’s proven absolute-range adapter: every live integer `0–100` maps to
an indexed frame reference before `IMG_LEVEL` generation, while the widget binds
to `BIO_CHARGE`. Physical-device confirmation remains in T026.

## Required evidence to reopen implementation

Obtain one untouched Watchface Maker package/project created for a BioCharge-
capable target with a BioCharge numeric element. Preferably also export pointer
or progress variants if Maker offers them. Record:

- target watch model and firmware/Zepp OS version;
- generated constant or numeric data-type ID;
- widget kind and complete properties;
- invalid/empty asset properties and observed no-data behavior;
- main/AOD behavior;
- on-device values compared with the native BioCharge app.

## Official sources

- Zepp watch-face data types: https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/
- Zepp watch-face design rules: https://docs.zepp.com/docs/designs/customization/watchface/
- Zepp `TEXT_IMG`: https://docs.zepp.com/docs/v2/reference/device-app-api/hmUI/widget/TEXT_IMG/
- Zepp `IMG_POINTER`: https://docs.zepp.com/docs/v2/watchface/api/hmUI/widget/IMG_POINTER/
- Zepp `ARC_PROGRESS`: https://docs.zepp.com/docs/1.0/watchface/api/hmUI/widget/ARC_PROGRESS/
- Zepp `IMG_LEVEL`: https://docs.zepp.com/docs/1.0/watchface/api/hmUI/widget/IMG_LEVEL/
- Amazfit T-Rex 3 Pro BioCharge support: https://support.amazfit.com/us/amazfit_t-rex_3_pro/docs/Fb9odmzyeozSt9x0iCycZm3Qnhd
- Amazfit Active Max BioCharge support: https://support.amazfit.com/us/amazfit_active_max/docs/HjpgdI2haosoIwxB5izcNU7gn9d
- Amazfit Balance manual (Readiness): https://support.amazfit.com/tw/amazfit_balance/files/user-manual.pdf.pdf

## Repository finding

System A currently contains a demo comment/preset that conflates “PAI/BIO
CHARGE,” and the AI prompt maps “bio charge” to PAI. Neither is runtime evidence.
No BioCharge schema, chooser rule, preview contract, assets, or generator binding
exists. T019 intentionally changes none of those surfaces.
