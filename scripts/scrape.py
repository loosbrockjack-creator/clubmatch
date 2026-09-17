"""Scrape every Iowa State student organization from stuorg.iastate.edu.

Pulls the A-Z directory, then each org's /information page (categories,
description, tier, membership, meetings, activities, special events).
Writes raw records to orgs_raw.json. Stdlib only.
"""

import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.stuorg.iastate.edu"
DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
OUT = os.path.join(DATA, "stuorg-raw.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def get(url, tries=3):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            if attempt == tries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
        except Exception:
            if attempt == tries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def main_block(page):
    i = page.find('id="main-content"')
    i = page.find(">", i) + 1 if i != -1 else -1
    j = page.find("</main>")
    if i == -1 or j == -1:
        return ""
    return page[i:j]


def strip_tags(fragment):
    fragment = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", fragment)
    fragment = re.sub(r"(?i)<br\s*/?>", "\n", fragment)
    fragment = re.sub(r"(?i)</(p|div|li|tr|h[1-6])>", "\n", fragment)
    fragment = re.sub(r"(?i)<li[^>]*>", "\n- ", fragment)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    text = html.unescape(fragment)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return "\n".join(line.strip() for line in text.split("\n")).strip()


def directory():
    page = get(f"{BASE}/organizations")
    if not page:
        sys.exit("could not load /organizations")
    i = page.find("<tbody")
    j = page.find("</tbody>", i)
    rows = re.findall(r'<a href="/([^"/]+)">(.*?)</a>', page[i:j], re.S)
    seen, out = set(), []
    for slug, name in rows:
        name = strip_tags(name)
        if slug in seen or not name:
            continue
        seen.add(slug)
        out.append({"slug": slug, "name": name})
    return out


def section(block, heading):
    """Text of the section following an <h2>heading</h2> up to the next <h2>."""
    m = re.search(rf"(?i)<h2[^>]*>\s*{re.escape(heading)}\s*</h2>", block)
    if not m:
        return ""
    rest = block[m.end():]
    nxt = re.search(r"(?i)<h2[^>]*>", rest)
    return rest[: nxt.start()] if nxt else rest


def table_rows(fragment):
    out = {}
    for tr in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", fragment):
        cells = re.findall(r"(?is)<td[^>]*>(.*?)</td>", tr)
        if len(cells) >= 2:
            key = strip_tags(cells[0])
            val = strip_tags(cells[1])
            if key:
                out[key] = val
    return out


def scrape_info(org):
    slug = org["slug"]
    page = get(f"{BASE}/{slug}/information")
    rec = dict(org, ok=False)
    if not page:
        return rec

    block = main_block(page)
    rec["ok"] = True

    rec["categories"] = [
        strip_tags(m)
        for m in re.findall(
            r'(?is)<a class="btn btn-xs btn-default"[^>]*href="/organizations/\d+/type">(.*?)</a>',
            block,
        )
    ]

    rec["description"] = strip_tags(section(block, "Description"))

    tier = table_rows(section(block, "Constitution / Tier"))
    rec["tier"] = tier.get("Tier", "")

    memb = table_rows(section(block, "Membership Information"))
    rec["studentMembers"] = memb.get("Student Members", "")
    rec["membershipQualifications"] = memb.get("Membership Qualifications", "")
    rec["membershipRestrictions"] = memb.get("Membership Restrictions", "")
    rec["allowedMembers"] = memb.get("Allowed Members", "")
    rec["elections"] = memb.get("Elections/Selection", "")
    rec["meetings"] = memb.get("Meetings", "")

    def single_cell(heading):
        frag = section(block, heading)
        cells = re.findall(r"(?is)<td[^>]*>(.*?)</td>", frag)
        text = strip_tags(cells[0]) if cells else ""
        return "" if text.strip().lower() in ("none", "") else text

    rec["activities"] = single_cell("Description of Regular Meetings/Activities")
    rec["specialEvents"] = single_cell("Description of Special Events")

    assoc = section(block, "Non-ISU Associations")
    if "no Non-ISU Associations" in assoc:
        rec["associations"] = []
    else:
        rec["associations"] = [
            s for s in (strip_tags(assoc) or "").split("\n") if s.strip()
        ]

    # The org's own landing page often carries richer prose than the DB record.
    home = get(f"{BASE}/{slug}")
    rec["homeText"] = strip_tags(main_block(home))[:6000] if home else ""
    rec["links"] = sorted(
        set(
            html.unescape(u)
            for u in re.findall(r'href="(https?://[^"]+)"', main_block(home) or "")
            if "iastate.edu" not in u
        )
    )[:12]
    return rec


if __name__ == "__main__":
    orgs = directory()
    print(f"directory: {len(orgs)} orgs", flush=True)

    done = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for n, rec in enumerate(pool.map(scrape_info, orgs), 1):
            done.append(rec)
            if n % 25 == 0:
                print(f"  {n}/{len(orgs)}", flush=True)

    with open(OUT, "w") as fh:
        json.dump(done, fh, indent=1)

    ok = sum(1 for r in done if r.get("ok"))
    withdesc = sum(1 for r in done if (r.get("description") or "").strip())
    print(f"done: {ok}/{len(done)} pages, {withdesc} with descriptions -> {OUT}")
