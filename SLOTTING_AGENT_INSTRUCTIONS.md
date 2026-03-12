# Slotting Assignment Instructions (For Next AI Agent)

## Goal
Generate or update a mission slotting JSON by assigning **project squads** into an existing **in-game slot layout**.

This document is for cases where:
- mission slotting JSON can differ between missions,
- project squads and counts can differ between events,
- in-game squads (like `1-1`, `1-2`, `2-3`) must stay intact.

## Terms
- `in-game squad`: Squad node already present in slotting JSON (`1-1`, `1-2`, etc.).
- `project squad`: External group to place into slots (for example `TT`, `ALFA`, `REV`).
- `assigned slot`: Slot occupied by a project squad placeholder.
- `free slot`: Slot not occupied by project squad placeholder.

## Hard Rules (Do Not Break)
1. Keep mission structure unchanged:
- Do not rename or delete sides.
- Do not rename or delete in-game squads.
- Do not add/remove/reorder slots.
- Do not change slot IDs or roles.

2. Assigned project-squad slots must use:
- `"access": "squad"`
- `"occupant": { "type": "placeholder", "label": "<PROJECT_SQUAD>" }`

3. Never mark project-squad-assigned slots as `priority` or `regular`.

4. For unassigned slots:
- Keep original access if valid (`priority` or `regular`),
- Keep or restore `occupant: null` unless explicitly told to preserve existing placeholder/user occupants.

5. Do not add text decorations to squad labels unless explicitly requested:
- Use `"TT"`, not `"TT (Tester)"`.

## Placement Strategy
### A) Side balancing (proportional)
When user does not force side-specific counts, distribute assigned slots proportionally to side capacities.

Formula:
- `target(side) = round(totalRequestedSlots * sideCapacity / totalCapacity)`
- Adjust by largest remainder so sum of targets equals `totalRequestedSlots` exactly.

Example:
- USK capacity = 49, KPA capacity = 77, total = 126
- requested = 82
- USK target ~= 82 * 49/126 = 31.9 -> 32
- KPA target = 50

### B) Front-load assignment
Within each side, fill from earliest in-game squads first:
1. earlier squad order (`1-1`, `1-2`, `1-3`, ...)
2. earlier slot index first

This preserves the rule: regular/priority gameplay space naturally remains in later squads where possible.

### C) Keep project squads together
Try to keep each project squad contiguous and unsplit.

Split only if needed due to capacity constraints.
If split is required:
1. prefer split across at most 2 neighboring in-game squads,
2. keep split on same side before crossing sides,
3. minimize number of fragments.

### D) Squad leader placement on split
When a project squad is split across two or more in-game squads, the "Squad Leader" role slot for that project squad must be placed in the in-game squad where the project squad occupies the majority of slots.

Example:
- `TT` has 12 slots, split as 9 in `1-2` and 3 in `1-3`.
- The Squad Leader slot for `TT` must be in `1-2` (9 > 3).

If the split is exactly equal, place the Squad Leader in the earlier in-game squad.

## Assignment Procedure
1. Parse canonical slotting JSON.
2. Build side capacity map and in-game traversal order.
3. Compute per-side slot targets.
4. Reset only assignment-related fields (safe mode):
- clear old placeholder occupants,
- set previously project-assigned slots back to original non-squad access if known; otherwise default to `regular`.
5. Place project squads in descending count order (largest first), respecting side targets and front-load rules.
6. For each assigned slot:
- set `access` to `squad`,
- set placeholder occupant label to project squad name.
7. Leave remaining slots unassigned for regular/priority flow.
8. Validate (must pass all checks below).

## Validation Checklist (Must Pass)
1. Structure unchanged:
- same sides, same in-game squads, same slot IDs and roles.

2. Count correctness:
- each project squad assigned exactly requested number of slots.

3. Access correctness:
- all assigned placeholders have `access === "squad"`.
- no assigned placeholder has `priority` or `regular`.

4. Side target correctness:
- per-side assigned totals match proportional targets (unless user overrides).

5. Front-load correctness per side:
- no assigned slot appears after an unassigned gap in side traversal order.

## Generic Example
### Input project squads
- `TT: 12`
- `ALFA: 12`
- `KABAN: 8`
- `REV: 8`

### Input in-game layout excerpt
```json
{
  "name": "USK",
  "squads": [
    { "name": "1-1", "slots": ["...2 slots..."] },
    { "name": "1-2", "slots": ["...9 slots..."] },
    { "name": "1-3", "slots": ["...9 slots..."] }
  ]
}
```

### Output pattern excerpt
```json
{
  "name": "1-2",
  "slots": [
    {
      "id": "side-1-squad-2-slot-1-squad-leader",
      "role": "Squad Leader",
      "access": "squad",
      "occupant": { "type": "placeholder", "label": "TT" }
    }
  ]
}
```

And if `TT` still needs extra slots after `1-2`, continue into earliest next slot(s), for example `1-3` slot 1.

## Edge Cases
1. Requested total exceeds free capacity:
- fail with explicit message and required/available numbers.

2. Mission already has user occupants:
- do not overwrite `occupant.type === "user"` unless explicitly instructed.

3. Side override by user:
- if user gives exact per-side counts, use those over proportional formula.

4. Pre-existing placeholder occupants:
- clear and rebuild assignment unless user asks to preserve.

## Recommended Output Format For Reviews
After generating JSON, provide:
1. project squad -> assigned count
2. side -> assigned count
3. list of squads that were split (if any)
4. confirmation that all assigned slots are `access: "squad"`
5. confirmation that in-game structure was preserved
