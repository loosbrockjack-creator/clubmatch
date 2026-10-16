"""Scrape every Iowa State fraternity and sorority from sfe.dso.iastate.edu.

The Office of Sorority and Fraternity Engagement (SFE) lists each chapter with
its council and affiliation tags, and each chapter page carries text the
chapter wrote itself: nickname, description, motto, philanthropy, founding
dates, a member quote, housing details, and photos.

Writes raw records to data/sfe-raw.json and downloads one chapter photo per
chapter to public/photos/greek/<slug>.jpg. Portrait photos inside the member
quote block are headshots of individual students and are never downloaded.
Stdlib only, plus macOS `sips` to resize photos.
"""

import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://sfe.dso.iastate.edu"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "sfe-raw.json")
PHOTO_DIR = os.path.join(ROOT, "public", "photos", "greek")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

LISTS = {"fraternity": "/fraternities", "sorority": "/sororities"}
COUNCIL_PAGES = {
    "cpc": "/collegiate-panhellenic-council",
    "ifc": "/interfraternity-council",
    "mgc": "/multicultural-greek-council",
    "nphc": "/national-pan-hellenic-council",
}


def get(url, binary=False, tries=3):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read()
                return body if binary else body.decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            if exc.code == 404 or attempt == tries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
        except Exception:
            if attempt == tries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def main_block(page):
    i = page.find('id="main-content"')
    j = page.find("</main>")
    if i == -1 or j == -1:
        return ""
    return page[page.find(">", i) + 1:j]


def text(fragment):
    fragment = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", fragment)
    fragment = re.sub(r"(?i)<br\s*/?>", " ", fragment)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    out = html.unescape(fragment).replace("\xa0", " ")
    return re.sub(r"\s+", " ", out).strip()


# --- index pages -------------------------------------------------------------

def parse_index(page, kind):
    table = re.search(r"(?is)<table.*?</table>", page)
    if not table:
        return []
    rows = []
    for tr in re.findall(r"(?is)<tr>(.*?)</tr>", table.group(0)):
        cells = re.findall(r"(?is)<td[^>]*>(.*?)</td>", tr)
        if len(cells) < 5:
            continue
        link = re.search(r'href="/chapter/([^"]+)"', cells[0])
        rows.append({
            "kind": kind,
            "name": text(cells[0]),
            "slug": link.group(1) if link else "",
            "council": text(cells[1]),
            "academic": text(cells[2]),
            "identity": text(cells[3]),
            "religious": text(cells[4]),
        })
    return rows


# --- chapter pages -----------------------------------------------------------

def parse_chapter(page):
    body = main_block(page)
    rec = {}

    feature = re.search(
        r'(?is)class="feature-with-large-image__content">\s*<h2>(.*?)</h2>\s*'
        r'<div class="feature-with-large-image__text[^"]*">(.*?)</div>', body)
    if feature:
        heading = text(feature.group(1))
        rec["nickname"] = re.sub(r"(?i)^nickname:\s*", "", heading) if heading.lower().startswith("nickname") else ""
        rec["description"] = text(feature.group(2))

    facts = {}
    for dt, dd in re.findall(r"(?is)<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", body):
        key = text(dt)
        link = re.search(r'href="([^"]+)"', dd)
        is_link = any(word in key.lower() for word in ("website", "social"))
        facts[key] = link.group(1) if link and is_link else text(dd)
    rec["facts"] = facts

    quote = re.search(
        r'(?is)class="iastate22-blockquote__quote">(.*?)</h2>.*?'
        r'class="iastate22-blockquote__author">(.*?)</p>', body)
    if quote:
        rec["quote"] = text(quote.group(1)).strip('"“” ')
        rec["quoteAuthor"] = text(quote.group(2))

    housing = []
    table = re.search(r"(?is)<th>\s*Housing\s*</th>.*?<tbody>(.*?)</tbody>", body)
    if table:
        for tr in re.findall(r"(?is)<tr>(.*?)</tr>", table.group(1)):
            cells = [text(c) for c in re.findall(r"(?is)<td[^>]*>(.*?)</td>", tr)]
            if len(cells) == 2 and cells[1]:
                housing.append({"label": cells[0], "value": cells[1]})
    rec["housing"] = housing

    # Photos, minus the member-quote portrait (a headshot of one student).
    no_portraits = re.sub(r'(?is)<div class="iastate22-blockquote__portrait">.*?</div>', "", body)
    photos = []
    for m in re.finditer(r'(?is)<img[^>]*src="([^"]+)"[^>]*>', no_portraits):
        tag = m.group(0)
        w = re.search(r'width="(\d+)"', tag)
        h = re.search(r'height="(\d+)"', tag)
        before = no_portraits[:m.start()]
        where = "full" if before.rfind("full-width-image") > before.rfind("feature-with-large-image__media") else "feature"
        photos.append({
            "src": html.unescape(m.group(1)),
            "width": int(w.group(1)) if w else 0,
            "height": int(h.group(1)) if h else 0,
            "where": where,
        })
    rec["photos"] = photos
    return rec


# Portrait photos that were checked by eye and hold up as a centered 3:2 crop.
# Everything else portrait or square is skipped: on SFE those are usually
# graphics with text baked in, which crop badly.
PORTRAIT_CROP_OK = {"sigma-lambda-beta-international-fraternity-inc"}


def pick_photo(slug, photos):
    """Prefer a landscape full-width image, then any landscape, then nothing."""
    landscape = [p for p in photos if p["width"] >= p["height"] * 1.15 and p["width"] >= 800]
    for p in landscape:
        if p["where"] == "full":
            return p
    if landscape:
        return landscape[0]
    if slug in PORTRAIT_CROP_OK and photos:
        return dict(photos[0], crop=True)
    return None


def download_photo(slug, photo):
    os.makedirs(PHOTO_DIR, exist_ok=True)
    path = os.path.join(PHOTO_DIR, f"{slug}.jpg")
    src = photo["src"]
    data = get(src if src.startswith("http") else BASE + src, binary=True)
    if not data:
        return None
    tmp = path + ".src"
    with open(tmp, "wb") as fh:
        fh.write(data)
    if photo.get("crop"):
        w = photo["width"]
        subprocess.run(["sips", "--cropToHeightWidth", str(round(w / 1.5)), str(w), tmp],
                       check=True, capture_output=True)
    # Normalize to a 1400px JPEG. next/image resizes again per device, so the
    # source only needs to cover the detail banner at 2x on a laptop.
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "60", "-Z", "1400", tmp, "--out", path],
        check=True, capture_output=True)
    os.remove(tmp)
    return f"/photos/greek/{slug}.jpg"


# --- council pages -----------------------------------------------------------

def parse_council(page):
    body = text(main_block(page))
    about = re.search(r"About Us (.*?) Everything You Need [Tt]o Know", body)
    need = re.search(r"Everything You Need [Tt]o Know\s*(.*?)(?: Governing and Important| Important and Governing|$)", body)
    return {
        "about": about.group(1).strip() if about else "",
        "details": need.group(1).strip()[:2000] if need else "",
    }


def scrape_chapter(row):
    if not row["slug"]:
        return row
    url = f"{BASE}/chapter/{row['slug']}"
    page = get(url)
    row["sfeUrl"] = url
    if not page:
        return row
    row.update(parse_chapter(page))
    photo = pick_photo(row["slug"], row.get("photos", []))
    row["photo"] = download_photo(row["slug"], photo) if photo else None
    return row


def main():
    rows = []
    for kind, path in LISTS.items():
        page = get(BASE + path)
        if not page:
            sys.exit(f"Could not fetch {path}")
        rows.extend(parse_index(page, kind))
    print(f"{len(rows)} chapters listed")

    with ThreadPoolExecutor(max_workers=6) as pool:
        chapters = list(pool.map(scrape_chapter, rows))

    councils = {}
    for key, path in COUNCIL_PAGES.items():
        page = get(BASE + path)
        councils[key] = parse_council(page) if page else {}

    with open(OUT, "w") as fh:
        json.dump({"chapters": chapters, "councils": councils}, fh, indent=1, ensure_ascii=False)

    no_page = [c["name"] for c in chapters if "facts" not in c]
    no_photo = [c["name"] for c in chapters if not c.get("photo")]
    print(f"wrote {OUT}")
    print(f"no chapter page ({len(no_page)}): {', '.join(no_page)}")
    print(f"no usable photo ({len(no_photo)}): {', '.join(no_photo)}")


if __name__ == "__main__":
    main()
