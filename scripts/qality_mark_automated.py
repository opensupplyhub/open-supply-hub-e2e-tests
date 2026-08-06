#!/usr/bin/env python3
"""Mark QAlity Plus test-cycle executions Passed when covered by this repo's automation.

Required:
  --cycle-id <id>
  QALITY_API_TOKEN env (or --token)

Optional:
  --dry-run
  --comment "..."
  --tests-dir tests
  --issue-map map.json   # {"11292": 1235, ...} jira issue id -> OSDEV number
  --passed-status-id 49015

Matching: OSDEV ticket (via --issue-map or Jira env) first, then name similarity.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any

DEFAULT_BASE = "https://apps-qalityplus.soldevelo.com/api"
DEFAULT_PASSED_STATUS_ID = 49015
OSDEV_RE = re.compile(r"OSDEV-(\d+)", re.I)
TITLE_RE = re.compile(
    r"""test(?:\.describe)?(?:\.serial)?\(\s*[`'"]([^`'"]+)""",
    re.M,
)


def load_dotenv(path: pathlib.Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip("'").strip('"')
        os.environ.setdefault(key, val)


def api_request(
    method: str,
    url: str,
    token: str,
    payload: dict | None = None,
) -> Any:
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        err = e.read().decode(errors="ignore")
        raise RuntimeError(f"{method} {url} -> HTTP {e.code}: {err[:500]}") from e


def collect_repo_automation(tests_dir: pathlib.Path) -> tuple[set[int], list[str]]:
    osdev_ids: set[int] = set()
    titles: list[str] = []
    for path in tests_dir.rglob("*.ts"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for m in OSDEV_RE.finditer(text):
            osdev_ids.add(int(m.group(1)))
        for m in TITLE_RE.finditer(text):
            title = m.group(1)
            if "OSDEV-" in title.upper() or "[@" in title:
                titles.append(title)
    return osdev_ids, titles


def normalize_name(s: str) -> str:
    s = OSDEV_RE.sub(" ", s)
    s = re.sub(r"(?i)test case execution", " ", s)
    s = re.sub(r"\[@[^\]]+\]", " ", s)
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


_STOP = {
    "test",
    "case",
    "execution",
    "check",
    "the",
    "a",
    "an",
    "and",
    "or",
    "for",
    "with",
    "from",
    "page",
    "integration",
    "auto",
    "regression",
    "smoke",
    "moderation",
    "queue",
    "data",
    "download",
    "limits",
    "user",
    "can",
    "is",
    "are",
    "to",
    "of",
    "in",
    "on",
}


def _significant_tokens(s: str) -> set[str]:
    return {t for t in normalize_name(s).split() if t not in _STOP and len(t) > 2}


def name_matches(cycle_name: str, repo_titles: list[str]) -> tuple[bool, int | None]:
    """Return (matched, osdev_from_title). Prefer long substring / high token overlap."""
    target = normalize_name(cycle_name)
    if len(target) < 20:
        return False, None
    target_sig = _significant_tokens(cycle_name)
    if len(target_sig) < 3:
        return False, None

    best: tuple[float, int | None] = (0.0, None)
    for title in repo_titles:
        cand = normalize_name(title)
        if len(cand) < 12:
            continue
        m = OSDEV_RE.search(title)
        osdev = int(m.group(1)) if m else None
        # Strong: one normalized string contains the other (len >= 24)
        if len(cand) >= 24 and (cand in target or target in cand):
            return True, osdev
        cand_sig = _significant_tokens(title)
        if len(cand_sig) < 3:
            continue
        overlap = len(target_sig & cand_sig) / max(len(target_sig), len(cand_sig))
        # Require high overlap AND at least 4 shared significant tokens
        if overlap >= 0.85 and len(target_sig & cand_sig) >= 4 and overlap > best[0]:
            best = (overlap, osdev)
    if best[0] >= 0.85:
        return True, best[1]
    return False, None


def resolve_issue_map_via_jira(issue_ids: list[int]) -> dict[int, int]:
    """Optional: JIRA_EMAIL + JIRA_API_TOKEN + JIRA_BASE_URL (default opensupplyhub)."""
    email = os.environ.get("JIRA_EMAIL")
    token = os.environ.get("JIRA_API_TOKEN")
    base = os.environ.get("JIRA_BASE_URL", "https://opensupplyhub.atlassian.net")
    if not email or not token or not issue_ids:
        return {}

    import base64

    auth = base64.b64encode(f"{email}:{token}".encode()).decode()
    mapping: dict[int, int] = {}
    # Jira cloud search in chunks
    chunk = 40
    for i in range(0, len(issue_ids), chunk):
        ids = issue_ids[i : i + chunk]
        jql = "id in (" + ",".join(str(x) for x in ids) + ")"
        url = f"{base}/rest/api/3/search/jql"
        payload = {"jql": jql, "maxResults": chunk, "fields": ["summary"]}
        # Prefer /search for broader compatibility
        url = f"{base}/rest/api/3/search"
        payload = {"jql": jql, "maxResults": chunk, "fields": ["summary"]}
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Basic {auth}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req) as resp:
                body = json.loads(resp.read().decode())
        except urllib.error.HTTPError:
            continue
        for issue in body.get("issues", []):
            key = issue.get("key") or ""
            m = OSDEV_RE.search(key)
            if m:
                mapping[int(issue["id"])] = int(m.group(1))
    return mapping


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cycle-id", type=int, required=True)
    parser.add_argument("--token", default=os.environ.get("QALITY_API_TOKEN"))
    parser.add_argument("--base-url", default=os.environ.get("QALITY_API_BASE", DEFAULT_BASE))
    parser.add_argument("--tests-dir", default="tests")
    parser.add_argument("--issue-map", help="JSON map of jiraIssueId -> OSDEV number")
    parser.add_argument("--passed-status-id", type=int, default=DEFAULT_PASSED_STATUS_ID)
    parser.add_argument("--comment", default="")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()

    repo_root = pathlib.Path(args.repo_root).resolve()
    load_dotenv(repo_root / ".env")
    token = args.token or os.environ.get("QALITY_API_TOKEN")
    if not token:
        print("Missing QALITY_API_TOKEN (env) or --token", file=sys.stderr)
        return 2

    tests_dir = (repo_root / args.tests_dir).resolve()
    repo_osdev, repo_titles = collect_repo_automation(tests_dir)
    print(f"Repo automation OSDEV ids: {len(repo_osdev)}")

    cycle = api_request("GET", f"{args.base_url.rstrip('/')}/testCycles/{args.cycle_id}", token)
    cases = cycle.get("testCases") or []
    print(f"Cycle {args.cycle_id}: {cycle.get('name')} — {len(cases)} cases")

    issue_map: dict[int, int] = {}
    if args.issue_map:
        raw = json.loads(pathlib.Path(args.issue_map).read_text(encoding="utf-8"))
        issue_map = {int(k): int(v) for k, v in raw.items()}
    else:
        ids = sorted({int(tc["testCaseId"]) for tc in cases})
        issue_map = resolve_issue_map_via_jira(ids)
        if issue_map:
            print(f"Resolved {len(issue_map)} issue ids via Jira")

    to_update: list[dict[str, Any]] = []
    already: list[str] = []
    unmatched: list[str] = []

    for tc in cases:
        ex = tc.get("testExecution") or {}
        status = (tc.get("statusDetail") or {}).get("name") or (
            (ex.get("statusObject") or {}).get("name")
        )
        jira_id = int(tc["testCaseId"])
        name = ex.get("name") or ""
        osdev = issue_map.get(jira_id)
        match_type = None
        if osdev is not None and osdev in repo_osdev:
            match_type = "ticket"
        else:
            matched, name_osdev = name_matches(name, repo_titles)
            if matched:
                # Name fallback only when ticket unknown or ticket not in repo
                if osdev is None or osdev not in repo_osdev:
                    match_type = "name"
                    if name_osdev is not None:
                        osdev = name_osdev

        label = f"pos={tc.get('position')} OSDEV-{osdev or '?'} {name[:70]}"
        if match_type is None:
            unmatched.append(label)
            continue
        if status == "Passed":
            already.append(label)
            continue
        to_update.append(
            {
                "position": tc.get("position"),
                "osdev": osdev,
                "match": match_type,
                "status": status,
                "executionId": ex.get("id"),
                "name": name,
            }
        )

    print(f"\nTo update: {len(to_update)} | already Passed: {len(already)} | no automation: {len(unmatched)}")
    for u in to_update:
        print(
            f"  [{u['match']}] pos={u['position']} OSDEV-{u['osdev']} "
            f"{u['status']} -> Passed | {u['name'][:70]}"
        )

    if args.dry_run:
        print("\nDry run — no changes made.")
        return 0

    ok = fail = 0
    for u in to_update:
        ex_id = u["executionId"]
        if not ex_id:
            print(f"FAIL missing executionId for pos={u['position']}")
            fail += 1
            continue
        fields: dict[str, Any] = {"statusId": args.passed_status_id}
        if args.comment:
            fields["comment"] = args.comment
        try:
            api_request(
                "PATCH",
                f"{args.base_url.rstrip('/')}/testExecutions/{ex_id}",
                token,
                {"fields": fields},
            )
            ok += 1
            print(f"OK  pos={u['position']} OSDEV-{u['osdev']}")
        except RuntimeError as e:
            fail += 1
            print(f"FAIL pos={u['position']} OSDEV-{u['osdev']}: {e}")
        time.sleep(0.12)

    updated = api_request("GET", f"{args.base_url.rstrip('/')}/testCycles/{args.cycle_id}", token)
    print(f"\nUpdated: {ok}  Failed: {fail}")
    print("Cycle status summary:")
    for s in updated.get("statuses") or []:
        st = s.get("status") or {}
        print(f"  {st.get('name')}: {s.get('total')} ({s.get('percent')}%)")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
