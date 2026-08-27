---
name: qality-mark-automated
description: >-
  After regression runs, mark QAlity Plus test-cycle cases as Passed when they
  are covered by Playwright automation in this repo. Match by OSDEV ticket
  number first, then by test name. Use when the user asks to update a QAlity
  test cycle, mark automated regression tests Passed, sync QAlity after e2e,
  or provides a testCycleId / QAlity token for post-regression actions.
---

# QAlity: mark automated regression tests Passed

Human-oriented usage guide: [README.md](README.md).

## When to use

Post-actions after regression / smoke automation in `open-supply-hub-e2e-tests`:
update matching cases in a QAlity Plus test cycle to **Passed**.

## Required inputs (ask if missing)

| Input | Required | Source |
|-------|----------|--------|
| `testCycleId` | **Yes** | Number from QAlity URL (`testCycleId=161991`) |
| `QALITY_API_TOKEN` | **Yes** | Env var preferred; Bearer token (`qps_...`) |

Do **not** ask the user to paste the token into chat if `QALITY_API_TOKEN` (or `.env`) is already set. Never commit the token.

## Optional inputs

| Input | Default | Notes |
|-------|---------|-------|
| `testsDir` | `tests/` | Where to scan for `OSDEV-####` |
| `--dry-run` | off | Match and print only; no PATCH |
| `--comment` | empty | Optional comment written on each updated execution |
| Base URL | `https://apps-qalityplus.soldevelo.com/api` | QAlity Plus Cloud |

Jira Cloud access (Atlassian MCP) is **optional**: used only to map numeric `testCaseId` → `OSDEV-####`. If unavailable, fall back to name matching from execution titles.

## Workflow

1. Confirm `testCycleId` and that a token is available (`QALITY_API_TOKEN` or user-provided once).
2. **Build issue map (recommended):** `GET` the cycle, collect unique `testCaseId`s, resolve via Atlassian MCP / Jira JQL `id in (...)` to `OSDEV-####`. Write `/tmp/qality-issue-map.json` as `{"11292": 1235, ...}`.
3. Run the helper script:

```bash
# preview
python3 scripts/qality_mark_automated.py --cycle-id <ID> --issue-map /tmp/qality-issue-map.json --dry-run
# apply
python3 scripts/qality_mark_automated.py --cycle-id <ID> --issue-map /tmp/qality-issue-map.json
```

Token: `QALITY_API_TOKEN` in env or `.env`. Optional Jira for map without MCP: `JIRA_EMAIL` + `JIRA_API_TOKEN`.

4. If the script cannot run, follow the same logic manually via API (see below).
5. Report: how many updated, match type (ticket vs name), cycle status totals, list of skipped (no automation).

## Matching rules

1. Collect unique `OSDEV-(\d+)` from `tests/**/*.ts` (and related test files).
2. `GET /testCycles/{testCycleId}` — load all assignments + executions.
3. Resolve each assignment’s Jira issue id (`testCaseId`) to key `OSDEV-N` (Atlassian/`id in (...)` JQL, or skip if no Jira).
4. **Ticket match (primary):** `OSDEV-N` from cycle ∈ set from repo → mark Passed.
5. **Name match (fallback):** if ticket not in repo, compare normalized execution/summary name to automated test titles / describe names; mark only on clear match (e.g. same smoke/moderation/download phrase).
6. Update only statuses that are not already **Passed** (typically Unexecuted / In Progress). Do not change Failed/Blocked unless the user explicitly asks.
7. Do **not** mark cases with no repo automation (e.g. manual change-list, Stripe, Potential Matches without OSDEV in code).

## QAlity API (Cloud)

Base: `https://apps-qalityplus.soldevelo.com/api`  
Auth: `Authorization: Bearer <QALITY_API_TOKEN>`

```http
GET  /testCycles/{testCycleId}
PATCH /testExecutions/{testExecutionId}
Content-Type: application/json

{"fields":{"statusId":49015}}
```

`49015` = Passed on opensupplyhub QAlity (confirm from cycle `statuses[].status` if env differs). Optional: add `"comment":"..."` inside `fields`.

## Output template

```markdown
## QAlity cycle <id> updated
- Matched & set Passed: N (ticket: X, name: Y)
- Already Passed (skipped): N
- No automation (left unchanged): N
- Cycle totals: Passed A% · Unexecuted B% · ...
```

List each updated `OSDEV-####` + short name.

## Security

- Prefer `QALITY_API_TOKEN` in `.env` (gitignored) or shell env.
- If the user pastes a token in chat, use it for the request, warn to rotate, and do not write it into tracked files.
