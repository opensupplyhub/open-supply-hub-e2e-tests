# QAlity mark automated — how to use

Skill that marks **Passed** in a QAlity Plus test cycle for cases covered by Playwright tests in this repo (`OSDEV-####` in `tests/`).

## Setup (once)

1. Generate a QAlity API token: QAlity Plus Dashboard → API Tokens (`qps_...`).
2. Add to local `.env` (gitignored):

```env
QALITY_API_TOKEN=qps_your_token_here
```

Optional (so the script can map Jira issue ids → `OSDEV-####` without Cursor Atlassian MCP):

```env
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_BASE_URL=https://opensupplyhub.atlassian.net
```

3. Confirm `.env.example` lists the same keys (no real secrets).

## Option A — ask the Cursor agent (skill)

After regression, in chat:

```text
Mark automated tests Passed in QAlity cycle 161991
```

or with a full URL:

```text
Update QAlity cycle https://opensupplyhub.atlassian.net/.../test-cycle-details?testCycleId=161991
— set Passed for tests automated in this repo
```

The agent will:

1. Read this skill (`.cursor/skills/qality-mark-automated/`)
2. Use `QALITY_API_TOKEN` from `.env` (ask only if missing)
3. Match cycle cases to repo by **OSDEV number**, then by **name**
4. Preview / apply updates and summarize results

You only need to provide:

| What | Required |
|------|----------|
| Test cycle id (or QAlity URL) | Yes |
| Token | Yes, but prefer `.env` — don’t paste into chat |

## Option B — run the script yourself

From the repo root:

```bash
# Preview (no changes)
python3 scripts/qality_mark_automated.py --cycle-id 161991 --dry-run

# Apply
python3 scripts/qality_mark_automated.py --cycle-id 161991
```

### Better matching with an issue map

QAlity returns numeric Jira ids (`testCaseId`), not `OSDEV-1235`. Pass a map for accurate ticket matching:

```bash
# map.json example: { "11292": 1235, "11276": 1219 }
python3 scripts/qality_mark_automated.py \
  --cycle-id 161991 \
  --issue-map /tmp/qality-issue-map.json \
  --dry-run
```

Without `--issue-map`, the script uses `JIRA_EMAIL` + `JIRA_API_TOKEN` if set, otherwise **name** matching only.

### Useful flags

| Flag | Meaning |
|------|---------|
| `--cycle-id` | QAlity test cycle id (required) |
| `--dry-run` | Print matches only |
| `--issue-map PATH` | JSON `jiraIssueId → OSDEV number` |
| `--comment "..."` | Comment on updated executions |
| `--token` | Override `QALITY_API_TOKEN` |
| `--tests-dir` | Default `tests` |

## How matching works

1. Scan `tests/**/*.ts` for `OSDEV-####`.
2. Load the cycle from QAlity API.
3. **Ticket match:** cycle case’s OSDEV is in the repo → Passed.
4. **Name match (fallback):** execution title clearly matches an automated test title.
5. Skip cases already Passed; leave manual / non-automated cases unchanged.

## Where to get the cycle id

From the QAlity URL:

```text
.../test-cycle-details?testCycleId=161991
                              ^^^^^^^^
```

## Security

- Keep `QALITY_API_TOKEN` in `.env` only.
- Don’t commit tokens or paste them into PRs.
- If a token was shared in chat, rotate it in the QAlity dashboard.

## Files

| Path | Role |
|------|------|
| `.cursor/skills/qality-mark-automated/SKILL.md` | Instructions for the agent |
| `scripts/qality_mark_automated.py` | CLI helper |
| `.env` / `.env.example` | Token configuration |
