#!/usr/bin/env python3
"""Structural checks for every workflow in this repository (standard library only).

Usage:  python tools/validate_workflows.py
Exit code is 0 when everything passes, 1 otherwise.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4000-8000-[0-9a-f]{12}$")
SECRET_RE = re.compile(r"(sk-[A-Za-z0-9]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,})")
TRIGGER_HINTS = ("Trigger", "webhook")


def check(path: Path) -> list[str]:
    errors: list[str] = []
    rel = path.relative_to(ROOT)
    text = path.read_text(encoding="utf-8")

    try:
        wf = json.loads(text)
    except json.JSONDecodeError as exc:
        return [f"{rel}: invalid JSON ({exc})"]

    for key in ("name", "nodes", "connections", "active", "settings", "meta"):
        if key not in wf:
            errors.append(f"{rel}: missing top-level field '{key}'")
    if wf.get("active") is not False:
        errors.append(f"{rel}: 'active' must be false")
    if wf.get("settings", {}).get("executionOrder") != "v1":
        errors.append(f"{rel}: settings.executionOrder must be 'v1'")

    if SECRET_RE.search(text):
        errors.append(f"{rel}: contains something that looks like a real secret")

    nodes = wf.get("nodes", [])
    names, ids = set(), set()
    for n in nodes:
        label = f"{rel}: node '{n.get('name')}'"
        if n.get("name") in names:
            errors.append(f"{label} has a duplicate name")
        names.add(n.get("name"))
        if not ID_RE.match(str(n.get("id", ""))):
            errors.append(f"{label} has an invalid id")
        if n.get("id") in ids:
            errors.append(f"{label} has a duplicate id")
        ids.add(n.get("id"))
        if "typeVersion" not in n or "type" not in n:
            errors.append(f"{label} is missing type/typeVersion")
        pos = n.get("position", [])
        if len(pos) != 2 or (pos[0] - 240) % 240 != 0:
            errors.append(f"{label} is off the 240px grid: {pos}")
        for ctype, cred in (n.get("credentials") or {}).items():
            if set(cred) != {"id", "name"}:
                errors.append(f"{label}: credential '{ctype}' must only hold id and name")

    graph: dict[str, list[str]] = {}
    for src, outputs in wf.get("connections", {}).items():
        if src not in names:
            errors.append(f"{rel}: connection from unknown node '{src}'")
        for branch in outputs.get("main", []):
            for link in branch:
                if link["node"] not in names:
                    errors.append(f"{rel}: connection to unknown node '{link['node']}'")
                graph.setdefault(src, []).append(link["node"])

    triggers = [n["name"] for n in nodes if any(h in n["type"] for h in TRIGGER_HINTS) and "respondTo" not in n["type"]]
    if len(triggers) != 1:
        errors.append(f"{rel}: expected exactly one trigger, found {triggers}")
    else:
        seen, stack = set(), [triggers[0]]
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            stack.extend(graph.get(cur, []))
        for orphan in sorted(names - seen):
            errors.append(f"{rel}: node '{orphan}' is not reachable from the trigger")

    if not (path.parent / "README.md").exists():
        errors.append(f"{rel}: no README.md next to the workflow")
    return errors


def main() -> int:
    files = sorted(p for p in ROOT.rglob("*.json") if ".git" not in p.parts and "node_modules" not in p.parts)
    if not files:
        print("No workflow files found.")
        return 1
    problems = []
    for f in files:
        found = check(f)
        problems += found
        print(("FAIL " if found else "ok   ") + str(f.relative_to(ROOT)))
    print(f"\n{len(files)} workflow(s) checked, {len(problems)} problem(s).")
    for p in problems:
        print(" -", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
