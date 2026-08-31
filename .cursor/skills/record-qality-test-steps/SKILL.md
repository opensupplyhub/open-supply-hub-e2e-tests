---
name: record-qality-test-steps
description: >-
  Record QA regression steps for Open Supply Hub QAlity/Jira OSDEV tickets on
  preprod, log clicks/API results to .cursor/sessions, and post Manual test
  steps as a Jira comment when the user says done. Use when the user pastes
  an opensupplyhub.atlassian.net OSDEV URL, asks to open a headed browser with
  .env login, track/record test steps, update a ticket title, or says done /
  ready after a manual or agent-driven regression check.
---

# Record QAlity test steps → Jira

Human guide: [README.md](README.md).

## Goal

User names an **OSDEV** QAlity test → agent opens preprod (with `.env` creds) →
user and/or agent exercise the flow → on **done** agent posts clean
**Manual test steps** into the Jira ticket.

## Triggers

| User says / pastes | Agent does |
| --- | --- |
| `https://opensupplyhub.atlassian.net/browse/OSDEV-####` or `OSDEV-####` | Start a session for that issue; always read the ticket |
| Link only, ticket has no steps | Open headed browser, then ask the engineer to perform the manual test there |
| Link only, ticket has steps | Go through the ticket steps |
| Link **and** steps/details in chat | Check the ticket too; combine all rules and requirements; go through them |
| login with admin rights / admin login | Use `USER_ADMIN_EMAIL` / `USER_ADMIN_PASSWORD` |
| Mid-session directions (API fetch, merge, split, verify page, etc.) | Execute and keep logging |
| done / ready / add … to the test case | Build steps from log → Jira comment |
| update the ticket title | `editJiraIssue` summary from observed behavior |
| rewrite / restart from a point | Kill old recorder, fresh log, reopen at that path |

## Environment

| Item | Value |
| --- | --- |
| App | `BASE_URL` from `.env` (default/practice: `https://preprod.os-hub.net`) |
| Admin UI login | `USER_ADMIN_EMAIL` / `USER_ADMIN_PASSWORD` → export as `LOGIN_EMAIL` / `LOGIN_PASSWORD` |
| Regular user | `USER_EMAIL` / `USER_PASSWORD` when ticket needs non-superuser |
| API token | `AUTH_TOKEN` or API user creds when user asks for API checks |
| Node | Prefer Node **v22** for Playwright |
| Browsers | `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright` |
| Jira cloud | Atlassian MCP; `cloudId`: `https://opensupplyhub.atlassian.net` |
| Session log | `.cursor/sessions/{ISSUE_KEY}-steps.jsonl` |

Never commit `.env` or paste passwords into Jira comments (mask as `***`).

Shell commands that `source .env` or mutate preprod usually need
`required_permissions: ["all"]` and Smart Mode approval when blocked.

## Workflow

### 1. Ticket arrives

1. Confirm the repo is **already on a new branch** for the current changes. If HEAD is `main` or `master`, stop and ask the engineer to check out a new branch before opening the browser or editing files.
2. `getJiraIssue` (`summary`, `description`, comments, labels, status). Always read the ticket, even when the user also pasted steps.
3. Infer start URL from title/description (dashboard path, admin, facilities, etc.).
4. Stop any previous `manual_test_recorder.js` / leftover headed Chromium for this workflow.
5. Decide how to execute (1b), then open the browser (2).

### 1b. Combine ticket + chat, then execute

A ticket **has steps** only when description or comments contain a real procedure (actions / expected results). Empty placeholders such as `1. …` do **not** count as steps.

| What the user sent | Ticket has steps? | Agent does |
| --- | --- | --- |
| Only the OSDEV link/key | No | Open the headed browser, then **ask an engineer to perform the manual test on the opened headed browser** |
| Only the OSDEV link/key | Yes | Go through the ticket steps in the headed browser |
| Steps and details provided with the task | Check inside either way | Make a combination of all rules and requirements (chat + ticket summary, description, comments, labels) and go through them |

Do not follow chat-only instructions while ignoring the ticket, or ticket-only steps while ignoring extra constraints the user sent with the link.

### 2. Open browser (default: recorder)

Prefer the repo recorder so clicks/nav/input are captured:

```bash
pkill -f "manual_test_recorder.js" 2>/dev/null || true
set -a && source .env && set +a
export PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright"
export LOGIN_EMAIL="${USER_ADMIN_EMAIL}"
export LOGIN_PASSWORD="${USER_ADMIN_PASSWORD}"
# usage: node scripts/manual_test_recorder.js [path] [issueKey]
node scripts/manual_test_recorder.js /dashboard/activityreports OSDEV-####
```

- Run with `block_until_ms: 0` (browser stays open).
- Cookie banner: click **ACCEPT** when present (recorder does this on auto-login).
- Confirm log file exists and `session_start` / `auto_login` / `ready` appear.
- Tell the user the ticket key + summary and that the browser is ready.

If the ticket has no steps and the user sent only the link, **ask an engineer to perform the manual test on the opened headed browser** and wait. Do not invent a flow.

**Agent-driven alternative:** when there are steps to follow (ticket and/or chat) and the flow is short and clear (confirm/reject, filter, download, ACL check), run a headed Playwright one-shot that mutates preprod as needed, appends structured events to the same jsonl, then summarize and wait for **done** before commenting. Still log IDs, API status, and UI assertions.

### 3. During the session

- Follow user mid-prompts (pick facility from API, merge first, verify redirect, recount matches, etc.).
- Keep appending to the same `{ISSUE}-steps.jsonl` (or restart clean if user asks to rewrite from a step).
- Prefer real OS IDs, report IDs, claim IDs, and API paths observed on preprod.
- If blocked (disabled control, empty data, 502), record **Blocked** with evidence — still write steps on **done**.
- Optional title fix: if UI text ≠ ticket wording (e.g. “Not found” vs “404”), update summary only when asked.

### 4. done → Jira comment

1. Read `.cursor/sessions/{ISSUE}-steps.jsonl` (and related notes).
2. Deduplicate noise; write **reproducible** steps in English (product UI labels as shown).
3. `addCommentToJiraIssue` with markdown body (template below).
4. Reply with a short confirmation + ticket link. Do **not** post until the user signals done (unless they explicitly say to write the comment now).

## Jira comment template

```markdown
## Manual test steps (recorded on preprod)
**Environment:** https://preprod.os-hub.net
**Date:** YYYY-MM-DD
**Account used:** <admin or user email, no password>

### Preconditions
1. …

### Test steps — <short name from ticket summary>
1. …
2. …

### Expected / Observed results
| Check | Result |
| --- | --- |
| … | … |

### Notes
- Blockers, related tickets, API endpoints, guides from description
```

Mark **PARTIAL** in the heading if the session did not cover the full ticket.

## Path cheatsheet (preprod)

| Area | Path |
| --- | --- |
| Dashboard | `/dashboard` |
| Status reports | `/dashboard/activityreports` (tabs CLOSURES / REOPENINGS) |
| Claims | `/dashboard/claims` |
| Merge | `/dashboard/mergefacilities` |
| Delete facility | `/dashboard/deletefacility` |
| Adjust matches | `/dashboard/adjustfacilitymatches` |
| Geocode | `/dashboard/geocoder` (link may say Geocode) |
| API Blocks | `/dashboard/apiblocks` |
| Link to new OS ID | `/dashboard/linkid` |
| Admin sources | `/admin/api/source/` |
| Facility profile | `/production-locations/{OS_ID}` |

## Related skill

After automation covers cases in a QAlity cycle: [qality-mark-automated](../qality-mark-automated/SKILL.md).
