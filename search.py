#!/usr/bin/env python3
"""Search literature.json by study/project and print boxed summaries.

Usage:
  python3 search.py "physio patterns"
  python3 search.py "physio patterns" --tags hrv,sleep        # must have ALL tags
  python3 search.py "physio patterns" --tags hrv,sleep --any  # ANY of the tags
  python3 search.py --list                                    # list all projects
"""
import argparse
import difflib
import json
import os
import sys
import textwrap

WIDTH = 88
INNER = WIDTH - 4
LEGACY_TYPES = {"Paper": "Source", "Model": "Method", "Dataset": "Data"}
HERE = os.path.dirname(os.path.abspath(__file__))


def load(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    for n in data.get("nodes", []):
        n["type"] = LEGACY_TYPES.get(n.get("type"), n.get("type"))
        n["projects"] = n.get("projects") or ([n["project"]] if n.get("project") else [])
        n["tags"] = uniq_tags(n.get("tags") or [])
    return data["nodes"]


def uniq_tags(tags):
    """Lowercase, dedupe and sort alphabetically (same as the web app)."""
    return sorted({str(t).strip().lower() for t in tags if str(t).strip()})


def all_projects(nodes):
    return sorted({p for n in nodes for p in n["projects"]}, key=str.lower)


def resolve(nodes, query):
    """Same rules as the web app: exact project match, else substring, else tag match."""
    q = query.strip().lower()
    projs = all_projects(nodes)
    hit = [p for p in projs if p.lower() == q] or [p for p in projs if q in p.lower()]
    if hit:
        s = set(hit)
        return hit, [n for n in nodes if s & set(n["projects"])], False
    return [], [n for n in nodes if any(q in t.lower() for t in n["tags"])], True


def wrap(text):
    """Wrap to the box width; hard-break long words/URLs so nothing escapes the box."""
    out = []
    for para in str(text).splitlines() or [""]:
        out += textwrap.wrap(para, INNER, break_long_words=True, break_on_hyphens=False) or [""]
    return out


def short_authors(a):
    names = [x.strip() for x in str(a or "").split(",") if x.strip()]
    return ", ".join(names[:3]) + (" et al." if len(names) > 3 else "")


def box(n, current):
    title = wrap(n["label"])
    lines = title[:]
    lines.append("─" * INNER)
    if n.get("url"):
        lines += wrap("URL: " + n["url"])
    meta = " · ".join(str(v) for v in (n.get("type"), short_authors(n.get("authors")), n.get("year"), n.get("venue")) if v)
    if meta:
        lines += wrap(meta)
    lines.append("")
    lines += wrap(n.get("summary") or "(no summary yet)")
    if n["tags"]:
        lines.append("")
        lines += wrap("Keywords: " + ", ".join(n["tags"]))
    others = [p for p in n["projects"] if p not in current]
    if others:
        lines += wrap("Also in: " + ", ".join(others))
    body = "\n".join(f"│ {l.ljust(INNER)} │" for l in lines)
    return f"┌{'─' * (WIDTH - 2)}┐\n{body}\n└{'─' * (WIDTH - 2)}┘"


def related(nodes, current, results):
    mine = {t.lower() for n in results for t in n["tags"]}
    out = []
    for p in all_projects(nodes):
        if p in current:
            continue
        theirs = {t.lower(): t for n in nodes if p in n["projects"] for t in n["tags"]}
        shared = sorted((theirs[k] for k in mine & theirs.keys()), key=str.lower)
        if shared:
            out.append((len(shared) / len(mine | theirs.keys()), p, shared))
    return sorted(out, reverse=True)[:8]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("query", nargs="*", help="study / project name (substring ok)")
    ap.add_argument("--tags", default="", help="comma-separated keywords to filter by")
    ap.add_argument("--any", action="store_true", help="match ANY keyword instead of ALL")
    ap.add_argument("--list", action="store_true", help="list all projects")
    ap.add_argument("--file", default=os.path.join(HERE, "literature.json"))
    a = ap.parse_args()

    nodes = load(a.file)
    query = " ".join(a.query).strip().strip("\"'")

    if a.list or not query:
        projs = all_projects(nodes)
        print("Projects:" if projs else "No projects yet — add a Study / Project to nodes in the app.")
        for p in projs:
            print(f"  • {p} ({sum(p in n['projects'] for n in nodes)})")
        return

    current, results, via_tag = resolve(nodes, query)
    if not results:
        print(f'No study or keyword matches "{query}".')
        names = all_projects(nodes)
        close = difflib.get_close_matches(query, names, n=5, cutoff=0.3)
        if close or names:
            print("Closest projects: " + ", ".join(close or names[:10]))
        return

    want = [t.strip().lower() for t in a.tags.split(",") if t.strip()]
    filtered = results
    if want:
        def ok(n):
            have = {t.lower() for t in n["tags"]}
            return any(w in have for w in want) if a.any else all(w in have for w in want)
        filtered = [n for n in results if ok(n)]

    filtered.sort(key=lambda n: (n["type"] != "Source", -(n.get("year") or 0), n["label"].lower()))

    head = f"Keyword: {query}" if via_tag else "Study: " + ", ".join(current)
    note = f"  [tags {'any' if a.any else 'all'} of: {', '.join(want)}]" if want else ""
    print(f"{head} — {len(filtered)} of {len(results)} item(s){note}\n")
    for n in filtered:
        print(box(n, current))

    counts, labels = {}, {}
    for n in results:
        for t in n["tags"]:
            labels.setdefault(t.lower(), t)
            counts[t.lower()] = counts.get(t.lower(), 0) + 1
    if counts:
        print("\nKeywords in this study: " + ", ".join(f"{labels[k]} ({counts[k]})" for k in sorted(counts)))
    rel = related(nodes, current, results)
    if rel:
        print("Related studies (shared keywords):")
        for _, p, shared in rel:
            print(f"  • {p} — {', '.join(shared[:5])}{' …' if len(shared) > 5 else ''}")
    if not via_tag:
        from urllib.parse import quote
        print(f"\nOpen in app: literature.html#study={quote(', '.join(current) if len(current) == 1 else query)}")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        sys.exit(f"Could not read {e.filename}")
