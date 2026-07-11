# Reference Register

Status: implementation record

This project stores only annotated coordinates, scene descriptions, and validation summaries. It does not store protected source media, extracted data, original art, original audio, logos, names, or frame redraws.

| referenceId | Source description | Access date | Use | Visible interval | Recorder | Reviewer | Repository storage allowed | Validation summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REF-PLAY-001 | Legally viewable public playthrough footage of an early side-scrolling training area, observed only for broad spatial order and interaction timing. | 2026-07-11 | Surface route order, first enemy timing, first block cluster, first gap, final ascent and finish flow. | 00:00-01:35 | Alchemy frontend worker | QA reviewer pending | No raw media; notes only | Confirms tutorial order: safe start, first walker, blocks, reward branch, gap, steps, finish. |
| REF-PLAY-002 | Publicly viewable completion footage captured at normal pace, observed for camera-safe spacing and reward branch entry/exit order. | 2026-07-11 | Reward area entrance/exit, coin corridor, return anchor, finish pacing. | 00:30-01:10 | Alchemy frontend worker | QA reviewer pending | No raw media; notes only | Confirms reward branch is bounded and returns to the main route before the finish. |
| REF-SELF-001 | Self-authored engineering blockout derived from the approved design documents, using original names and neutral grid coordinates. | 2026-07-11 | Runtime layout, collision map, entity list, trigger list, automated checks. | Full level grid | Alchemy frontend worker | QA reviewer pending | Yes | Confirms every gameplay object has a stable ID, revision, reference ID, and screen range. |

## Conflict Rulings

No conflicting source observations were stored in this repository. If a future observation changes layout, enemy timing, block content, or finish flow, a new revision must be created and the prior replay expectations must remain labeled with their revision.

## Freeze Summary

- Level schema: `sunrise-run-level-schema@1`
- Layout revision: `layout-r1`
- Tuning revision: `tuning-r1`
- Input revision: `input-r1`
- Asset manifest revision: `asset-r1`
- Freeze package contents represented in code: layout data, entity list, trigger list, collision map generator, layout diff baseline hash, and signoff fields.
- Human confirmation pending for candidate release: normal run-up crosses required gaps; spawn is not inside solid tiles; reward area has one entrance and one exit; block contents match the entity list; finish trigger is unique; hidden blocks are not visually disclosed before activation.
