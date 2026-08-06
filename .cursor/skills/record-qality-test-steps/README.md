# Record QAlity test steps

Skill for the agent workflow used in this repo: paste an **OSDEV** ticket, open preprod with `.env` login, record (or run) the regression flow, then on **done** post **Manual test steps** to Jira.

## You (QA)

1. Ensure `.env` has `BASE_URL`, `USER_ADMIN_EMAIL`, `USER_ADMIN_PASSWORD` (and other users if needed).
2. In Cursor chat, paste e.g. `https://opensupplyhub.atlassian.net/browse/OSDEV-3212`.
3. Test in the headed browser the agent opens (or let the agent drive a short flow).
4. Say **done** when finished — steps appear as a Jira comment.
5. Optional: **update the ticket title**, mid-session API/UI checks, **rewrite** from a given step.

## Agent

Follow [SKILL.md](SKILL.md). Recorder script: `scripts/manual_test_recorder.js`. Logs: `.cursor/sessions/OSDEV-####-steps.jsonl`.

## Related

- Mark automated cases Passed in a QAlity cycle: [../qality-mark-automated/](../qality-mark-automated/)
