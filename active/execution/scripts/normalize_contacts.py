#!/usr/bin/env python3
"""Join scraped officers with directory verification into final contact rows.

Produces one row per (club, person), merging people who hold two roles in the
same club, and splitting rows into verified vs needs-review.
Out: active/research/outreach/contacts_normalized.json
"""
import json, re, pathlib, datetime, unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / "research/outreach/officers_raw.json"
VER = ROOT / "research/outreach/directory_verify.json"
OUT = ROOT / "research/outreach/contacts_normalized.json"
TODAY = datetime.date.today().isoformat()

STOP = {"jr", "sr", "ii", "iii", "iv", "dr", "mr", "ms", "mrs", "prof"}


def toks(name):
    n = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    n = re.sub(r"[^A-Za-z\s\-']", " ", n).lower()
    return [t for t in re.split(r"[\s\-']+", n) if t and t not in STOP and len(t) > 1]


def name_match(stuorg, directory):
    """True when the StuOrg first and last name both appear in the directory name."""
    a, b = toks(stuorg), toks(directory)
    if not a or not b:
        return False
    return a[0] in b and a[-1] in b


def split_name(full):
    parts = [p for p in re.split(r"\s+", (full or "").strip()) if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


# Links a club lists on StuOrg are not all the club's own website: some are the
# national parent organization, some are signup forms, some are malformed. The
# Iowa-State-only rule means a link hosted at another university must never sit
# in a column a reader could mistake for this club's contact point.
NATIONAL_ORG_HOSTS = {"nar.org", "www.nar.org", "aias.org", "www.aias.org",
                      "blockandbridle.org", "www.blockandbridle.org",
                      "tripoli.org", "www.tripoli.org",
                      "vetswithoutbordersus.org", "www.vetswithoutbordersus.org"}


def classify_link(url):
    """-> (kind, url) where kind is 'club', 'national', 'form' or '' (discard)."""
    m = re.match(r"(?i)^https?://([^/]+)", url or "")
    if not m:
        return "", ""
    host = m.group(1).lower()
    if "." not in host or not re.match(r"^[a-z0-9.\-]+\.[a-z]{2,}$", host):
        return "", ""                                    # malformed, e.g. http://isusalesclub
    if re.search(r"(forms\.gle|docs\.google\.com/forms)", url, re.I):
        return "form", url
    if host.endswith(".edu") and not host.endswith("iastate.edu"):
        return "", ""                                    # another university: never show it
    if host in NATIONAL_ORG_HOSTS:
        return "national", url
    return "club", url


def main():
    clubs = json.loads(RAW.read_text())
    ver = {r["email"].lower(): r for r in json.loads(VER.read_text())}

    # how many clubs each email appears in, for the multi-club flag
    club_of = {}
    for c in clubs:
        for o in c["officers"]:
            if o["email"]:
                club_of.setdefault(o["email"].lower(), set()).add(c["name"])

    contacts, review, club_rows = [], [], []

    for c in clubs:
        merged = {}
        for o in c["officers"]:
            if not o["email"]:
                continue
            k = o["email"].lower()
            if k in merged:
                if o["role"] not in merged[k]["roles"]:
                    merged[k]["roles"].append(o["role"])
                merged[k]["required_officer"] |= o["required_officer"]
                continue
            merged[k] = {"email": o["email"], "stuorg_name": o["name"],
                         "roles": [o["role"]], "required_officer": o["required_officer"],
                         "shared_role": o.get("shared_role", False)}

        verified_n = 0
        for k, p in merged.items():
            v = ver.get(k, {})
            found = bool(v.get("found"))
            dname = v.get("directory_name", "") or ""
            matched = found and name_match(p["stuorg_name"], dname)
            is_adv = any("advisor" in r.lower() for r in p["roles"])
            kind = v.get("person_kind") or ("Faculty/Staff" if is_adv else "Student")
            display = dname if matched else p["stuorg_name"]
            first, last = split_name(display)
            others = sorted(club_of.get(k, set()) - {c["name"]})

            row = {
                "club": c["name"], "college": c["college"], "members": c.get("members"),
                "first_name": first, "last_name": last, "full_name": display,
                "role": " / ".join(p["roles"]),
                "email": p["email"],
                # A person holding a non-advisor officer role with no faculty or staff
                # record is a student officer, even when the directory publishes no
                # major or class year for them (some students suppress those fields).
                "person_type": ("Advisor" if is_adv
                                else "Student Officer" if kind in ("Student", "Unknown")
                                else kind),
                "required_officer": "Yes" if p["required_officer"] else "No",
                "shared_role": "Yes" if p["shared_role"] else "No",
                "major_or_department": v.get("major") or v.get("department") or "",
                "classification_or_title": v.get("classification") or v.get("job_title") or "",
                "phone": v.get("phone") or "",
                "other_clubs": ", ".join(others),
                "stuorg_name_as_listed": p["stuorg_name"],
                "directory_name": dname,
                "directory_verified": "Yes" if matched else "No",
                "source_url": c["officers_url"],
                "verify_url": v.get("lookup_url", ""),
                "last_verified": TODAY,
                "confidence": "High" if matched else ("Medium" if found else "Low"),
            }
            if matched:
                row["review_reason"] = ""
                contacts.append(row); verified_n += 1
            else:
                row["review_reason"] = ("Directory name does not match the name listed on StuOrg "
                                        f"(directory returned {dname!r})" if found
                                        else "No ISU directory record for this address; likely graduated or directory-suppressed")
                review.append(row)

        socials = {k: (c.get(k) or []) for k in ("instagram", "linkedin", "discord", "facebook", "twitter", "youtube")}
        # drop malformed links such as https://x.com/https
        for k, urls in socials.items():
            socials[k] = [u for u in urls if not re.search(r"/(https?)$", u)]
        inbox = [m for m in (c.get("mailto") or [])]
        links = [classify_link(u) for u in (c.get("external_sites") or [])]
        links = [(k, u) for k, u in links if k]
        club_rows.append({
            "club": c["name"], "college": c["college"], "members": c.get("members"),
            "stuorg_url": c["stuorgUrl"], "officers_url": c["officers_url"],
            "officers_listed": len(merged), "verified_contacts": verified_n,
            "needs_review": len(merged) - verified_n,
            "listed_contact_email": inbox[0] if inbox else "",
            "role_based_inbox": next((m for m in inbox if not re.match(
                r"^[a-z]{1,4}[a-z0-9]{0,4}\d{0,3}@iastate\.edu$", m.lower())), ""),
            "instagram": socials["instagram"][0] if socials["instagram"] else "",
            "linkedin": socials["linkedin"][0] if socials["linkedin"] else "",
            "discord": socials["discord"][0] if socials["discord"] else "",
            "facebook": socials["facebook"][0] if socials["facebook"] else "",
            "x_twitter": socials["twitter"][0] if socials["twitter"] else "",
            "youtube": socials["youtube"][0] if socials["youtube"] else "",
            "club_website": next((u for k, u in links if k == "club"), ""),
            "other_link": next((u for k, u in links if k in ("national", "form")), ""),
            "other_link_type": next(({"national": "National parent organization",
                                      "form": "Signup form"}[k]
                                     for k, u in links if k in ("national", "form")), ""),
            "coverage": "Covered" if verified_n else "No verified contact",
            "last_verified": TODAY,
        })

    order = {"President": 0, "Vice President": 1, "Treasurer": 2, "Secretary": 3}

    def sort_key(r):
        base = min([order.get(x.strip(), 50) for x in r["role"].split("/")] or [50])
        if r["person_type"] == "Advisor":
            base = 90
        return (r["college"], r["club"], base, r["last_name"])

    contacts.sort(key=sort_key)
    review.sort(key=sort_key)
    club_rows.sort(key=lambda r: (r["college"], r["club"]))

    OUT.write_text(json.dumps({"generated": TODAY, "contacts": contacts,
                               "needs_review": review, "clubs": club_rows}, indent=1))
    print(f"contacts={len(contacts)} needs_review={len(review)} clubs={len(club_rows)}")
    print(f"clubs with zero verified contacts: {sum(1 for r in club_rows if not r['verified_contacts'])}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
