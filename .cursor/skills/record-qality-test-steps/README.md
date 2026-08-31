# Record QAlity test steps

Skill for the agent workflow used in this repo: paste an **OSDEV** ticket, open preprod with `.env` login, record (or run) the regression flow, then on **done** post **Manual test steps** to Jira.

## Before you start

Perform this workflow **already on a new git branch** for the current changes (not `main` / `master`). Create and check out the branch before pasting the OSDEV link or asking the agent to record steps or generate tests.

## You (QA)

1. Ensure you are on that new branch.
2. Ensure `.env` has `BASE_URL`, `USER_ADMIN_EMAIL`, `USER_ADMIN_PASSWORD` (and other users if needed).
3. In Cursor chat, paste e.g. `https://opensupplyhub.atlassian.net/browse/OSDEV-3212`. You can send only the link, or the link plus extra steps/details.
4. Test in the headed browser the agent opens (or let the agent drive a short flow). If the ticket has no steps, the agent will ask you to perform the manual test in that browser.
5. Say **done** when finished — steps appear as a Jira comment.
6. Optional: **update the ticket title**, mid-session API/UI checks, **rewrite** from a given step.

## Agent

Follow [SKILL.md](SKILL.md). Recorder script: `scripts/manual_test_recorder.js`. Logs: `.cursor/sessions/OSDEV-####-steps.jsonl`.

## Related

- Mark automated cases Passed in a QAlity cycle: [../qality-mark-automated/](../qality-mark-automated/)
