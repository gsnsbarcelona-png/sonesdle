"""
Worlds & MSI roster scraper for lol.fandom.com
Outputs: worlds_rosters.json (equipo, evento, posición y página de cada jugador).

Nombre real, país y bandera los añade build.py desde Leaguepedia Cargo,
que también genera rostergues/js/data/rosters.js.
"""
import requests
import json
import re
import os
import sys
import io
import time
import unicodedata
from bs4 import BeautifulSoup
from urllib.parse import unquote

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
LEGACY_JSON   = os.path.join(SCRIPT_DIR, "rosters_legacy.json")
OUT_JSON      = os.path.join(SCRIPT_DIR, "worlds_rosters.json")

BASE_URL = "https://lol.fandom.com"
API_URL  = f"{BASE_URL}/api.php"
API_DELAY = 1.0

# (year, page, event_label)
# 2011-2014 use rosters_legacy.json (wiki data unreliable for those years)
TOURNAMENTS = [
    (2015, "2015_Season_World_Championship",       "Season 5 World Championship"),
    (2016, "2016_Season_World_Championship",       "Season 6 World Championship"),
    (2017, "2017_Season_World_Championship",       "Season 7 World Championship"),
    (2018, "2018_Season_World_Championship",       "Season 8 World Championship"),
    (2019, "2019_Season_World_Championship",       "Season 9 World Championship"),
    (2020, "2020_Season_World_Championship",       "Season 10 World Championship"),
    (2021, "2021_Season_World_Championship",       "Season 11 World Championship"),
    (2022, "2022_Season_World_Championship",       "Season 12 World Championship"),
    (2023, "2023_Season_World_Championship",       "Season 13 World Championship"),
    (2024, "2024_Season_World_Championship",       "Season 14 World Championship"),
    (2025, "2025_Season_World_Championship",       "Season 15 World Championship"),
    # MSI
    (2015, "2015_Mid-Season_Invitational",         "MSI 2015"),
    (2016, "2016_Mid-Season_Invitational",         "MSI 2016"),
    (2017, "2017_Mid-Season_Invitational",         "MSI 2017"),
    (2018, "2018_Mid-Season_Invitational",         "MSI 2018"),
    (2019, "2019_Mid-Season_Invitational",         "MSI 2019"),
    (2021, "2021_Mid-Season_Invitational",         "MSI 2021"),
    (2022, "2022_Mid-Season_Invitational",         "MSI 2022"),
    (2023, "2023_Mid-Season_Invitational",         "MSI 2023"),
    (2024, "2024_Mid-Season_Invitational",         "MSI 2024"),
]


POSITION_MAP = {
    "top laner": "Top", "top": "Top",
    "jungler": "Jungle", "jungle": "Jungle",
    "mid laner": "Mid", "middle": "Mid", "mid": "Mid",
    "bot laner": "ADC", "ad carry": "ADC", "bot": "ADC", "adc": "ADC",
    "support": "Support", "sup": "Support",
}
_POS_KEYS = sorted(POSITION_MAP, key=len, reverse=True)

STARTER_ROLES = {"Top Laner", "Jungler", "Mid Laner", "Bot Laner", "Support"}

SEED_REGION_RE = [
    (re.compile(r"/wiki/(LCK)/",    re.I), "LCK"),
    (re.compile(r"/wiki/(LPL)/",    re.I), "LPL"),
    (re.compile(r"/wiki/(LEC)/",    re.I), "LEC"),
    (re.compile(r"/wiki/(LCS)/",    re.I), "LCS"),
    (re.compile(r"/wiki/(PCS)/",    re.I), "PCS"),
    (re.compile(r"/wiki/(VCS)/",    re.I), "VCS"),
    (re.compile(r"/wiki/(CBLOL)/",  re.I), "CBLOL"),
    (re.compile(r"/wiki/(LLA)/",    re.I), "LLA"),
    (re.compile(r"/wiki/(LJL)/",    re.I), "LJL"),
    (re.compile(r"/wiki/(LCO)/",    re.I), "LCO"),
    (re.compile(r"/wiki/(LMS)/",    re.I), "LMS"),
    (re.compile(r"/wiki/(GPL)/",    re.I), "GPL"),
    (re.compile(r"/wiki/(OGN)/",    re.I), "LCK"),
    # Older paths ending with region name
    (re.compile(r"/China$",         re.I), "LPL"),
    (re.compile(r"/Korea$",         re.I), "LCK"),
    (re.compile(r"/Europe$",        re.I), "LEC"),
    (re.compile(r"/North_America$", re.I), "LCS"),
    (re.compile(r"/Taiwan$",        re.I), "LMS"),
    (re.compile(r"/Vietnam$",       re.I), "VCS"),
    (re.compile(r"/Brazil$",        re.I), "CBLOL"),
    (re.compile(r"/Latin_America",  re.I), "LLA"),
    (re.compile(r"/Japan$",         re.I), "LJL"),
    (re.compile(r"/Oceania$",       re.I), "LCO"),
    (re.compile(r"/Southeast_Asia", re.I), "GPL"),
]

SEED_TEXT_REGION = {
    "korea": "LCK", "lck": "LCK",
    "china": "LPL", "lpl": "LPL",
    "europe": "LEC", "emea": "LEC", "lec": "LEC",
    "north america": "LCS", "na ": "LCS", "lcs": "LCS",
    "taiwan": "LMS", "lms": "LMS", "hong kong": "LMS",
    "vietnam": "VCS", "vcs": "VCS",
    "brazil": "CBLOL", "cblol": "CBLOL",
    "latin america": "LLA", "lla": "LLA",
    "japan": "LJL", "ljl": "LJL",
    "oceania": "LCO", "oce": "LCO", "lco": "LCO",
    "pcs": "PCS", "sea": "GPL", "gpl": "GPL",
    "wildcard": "WC",
}

TEAM_REGION_FALLBACK = {
    # LCK
    "sk telecom t1": "LCK", "t1": "LCK", "kt rolster": "LCK", "kt": "LCK",
    "samsung galaxy": "LCK", "samsung white": "LCK", "samsung blue": "LCK", "samsung ozone": "LCK",
    "najin sword": "LCK", "najin black sword": "LCK", "najin white shield": "LCK",
    "koo tigers": "LCK", "rox tigers": "LCK", "longzhu gaming": "LCK",
    "griffin": "LCK", "damwon": "LCK", "dwg kia": "LCK", "dplus kia": "LCK",
    "kingzone dragonx": "LCK", "dragonx": "LCK", "gen.g": "LCK",
    "drx": "LCK", "hanwha life": "LCK", "afreeca freecs": "LCK",
    # LPL
    "royal club": "LPL", "star horn royal club": "LPL", "rng": "LPL",
    "invictus gaming": "LPL", "oh my god": "LPL", "team we": "LPL",
    "lgd gaming": "LPL", "lmq": "LPL", "i may": "LPL",
    "edward gaming": "LPL", "edg": "LPL",
    "funplus phoenix": "LPL", "top esports": "LPL", "jd gaming": "LPL",
    "bilibili gaming": "LPL", "weibo gaming": "LPL", "suning": "LPL",
    "lng esports": "LPL", "anyones legend": "LPL", "anyone's legend": "LPL",
    # LEC
    "fnatic": "LEC", "gambit gaming": "LEC", "moscow five": "LEC",
    "alliance": "LEC", "lemondogs": "LEC", "clg europe": "LEC",
    "sk gaming": "LEC", "h2k-gaming": "LEC", "origen": "LEC",
    "splyce": "LEC", "g2 esports": "LEC", "misfits gaming": "LEC",
    "team vitality": "LEC", "rogue": "LEC", "mad lions": "LEC",
    "mad lions koi": "LEC", "movistar koi": "LEC", "team bds": "LEC",
    # LCS
    "clg": "LCS", "clg prime": "LCS", "tsm": "LCS", "cloud9": "LCS",
    "team liquid": "LCS", "dignitas": "LCS", "epik gamer": "LCS",
    "against all authority": "LCS", "team gamed!de": "LCS", "xan": "LCS",
    "immortals": "LCS", "100 thieves": "LCS", "clutch gaming": "LCS",
    "flyquest": "LCS", "nrg": "LCS", "evil geniuses": "LCS",
    "golden guardians": "LCS", "team vulcun": "LCS",
    # LMS / PCS
    "taipei assassins": "LMS", "azubu frost": "LMS", "gamania bears": "LMS",
    "ahq esports club": "LMS", "flash wolves": "LMS", "mad team": "LMS",
    "g-rex": "LMS", "hk attitude": "PCS", "j team": "PCS",
    "psg talon": "PCS", "ctbc flying oyster": "PCS",
    # VCS / GPL
    "gigabyte marines": "GPL", "gam esports": "VCS",
    "phong vu buffalo": "VCS", "evos esports": "VCS", "saigon buffalo": "VCS",
    # CBLOL
    "kabum! esports": "CBLOL", "kabum esports": "CBLOL",
    "intz": "CBLOL", "loud": "CBLOL",
    "pain gaming": "CBLOL",   # paiN Gaming
    "vivo keyd": "CBLOL", "vivo keyd stars": "CBLOL",
    # LLA
    "infinity": "LLA", "team aze": "LLA", "estral esports": "LLA",
    "movistar r7": "LLA",
    # LJL
    "detonation fm": "LJL",
    # LCO
    "pentanet.gg": "LCO", "order": "LCO",
    # Wildcard
    "dark passage": "WC", "fenerbahce": "WC", "fenerbahce esports": "WC",
    "besiktas esports": "WC", "istanbul wildcats": "WC",
    "unicorns of love": "WC", "bangkok titans": "WC",
    "saigon jokers": "WC", "albus nox luna": "WC",
    "team pacific": "WC", "mineski": "GPL",
    "supermassive": "WC",
    "team secret whales": "VCS",
}

# Team names that legitimately end in numbers — never strip trailing digits from these
_PRESERVE_WITH_NUMBERS = frozenset({"T1", "Cloud9", "SK Telecom T1", "100 Thieves", "100T", "Movistar R7"})
_PRESERVE_LOWER = {n.lower(): n for n in _PRESERVE_WITH_NUMBERS}

_last_call = [0.0]


def rate_limit():
    elapsed = time.time() - _last_call[0]
    if elapsed < API_DELAY:
        time.sleep(API_DELAY - elapsed)
    _last_call[0] = time.time()


def fetch_page(page):
    rate_limit()
    try:
        resp = requests.get(API_URL,
            params={"action": "parse", "page": page, "format": "json", "prop": "text"},
            headers={"User-Agent": "worlds-roster-scraper/1.0"},
            timeout=25)
        data = resp.json()
        if "error" in data:
            return None
        return data["parse"]["text"]["*"]
    except Exception:
        return None




def normalize_position(raw):
    lower = raw.lower().strip()
    for key in _POS_KEYS:
        if key in lower:
            return POSITION_MAP[key]
    return raw


def region_from_seed(seed_text, seed_href):
    if seed_href:
        for pat, region in SEED_REGION_RE:
            if pat.search(seed_href):
                return region
    lower = seed_text.lower()
    for key, region in SEED_TEXT_REGION.items():
        if key in lower:
            return region
    return None


def clean_team_name(name):
    """Strip trailing disambiguation digits (e.g. Fnatic1 → Fnatic).
    Preserves team names that legitimately end in numbers (T1, Cloud9, etc.)."""
    name = name.strip()
    if name in _PRESERVE_WITH_NUMBERS:
        return name
    lower = name.lower()
    # Handle "Cloud93" → "Cloud9" (preserved base + extra disambiguation digit)
    for p_lower, p_orig in _PRESERVE_LOWER.items():
        if lower.startswith(p_lower) and lower[len(p_lower):].isdigit():
            return p_orig
    result = re.sub(r"\d+$", "", name).strip()
    return result if result else name


def _ascii_normalize(s):
    """Fold accented/special characters to ASCII for fuzzy dict lookup."""
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def team_region_fallback(team_name):
    key = team_name.lower().strip()
    result = TEAM_REGION_FALLBACK.get(key)
    if result:
        return result
    # Try ASCII-normalized key (handles ç → c, ş → s, İ → I, etc.)
    key_ascii = _ascii_normalize(key)
    return TEAM_REGION_FALLBACK.get(key_ascii)


def team_id(team_name, year):
    name = team_name.lower()
    name = re.sub(r"[^a-z0-9]+", "-", name).strip("-")
    return f"{name}-{year}"





def page_from_href(href):
    """/wiki/Viper_(Park_Do-hyeon) -> "Viper (Park Do-hyeon)" """
    return unquote(href.split("/wiki/", 1)[-1]).replace("_", " ") if href else ""


def parse_roster_table(table):
    """Extract players from a tournament-roster table"""
    th = table.find("th")
    team_name = th.get_text(strip=True) if th else ""

    players = []
    for row in table.find_all("tr"):
        role_sprite    = row.find("span", class_="role-sprite")
        player_span    = row.find("span", class_="tournament-roster-player")
        country_sprite = row.find("span", class_="country-sprite")

        if not player_span or not role_sprite:
            continue

        role_raw = role_sprite.get("title", "")
        if role_raw not in STARTER_ROLES:
            continue

        country = country_sprite.get("title", "") if country_sprite else ""
        name_link = player_span.find("a", href=True)
        name = name_link.get_text(strip=True) if name_link else player_span.get_text(strip=True).strip()
        href = name_link["href"] if name_link else ""

        players.append({
            "name":     name,
            "page":     page_from_href(href),
            "country":  country,   # del torneo; build.py usa la nacionalidad de Cargo
            "position": normalize_position(role_raw),
        })

    # One player per position: take the first listed for each role
    pos_order = {"Top": 0, "Jungle": 1, "Mid": 2, "ADC": 3, "Support": 4}
    players.sort(key=lambda p: pos_order.get(p["position"], 9))
    seen_pos = set()
    starters = []
    for p in players:
        if p["position"] not in seen_pos:
            seen_pos.add(p["position"])
            starters.append(p)
        if len(starters) == 5:
            break

    return team_name, starters


def extract_seed_for_table(block_or_context, table):
    """Get (seed_text, seed_href) for a tournament-roster table"""
    if block_or_context and block_or_context.name == "div":
        all_links = block_or_context.find_all("a", href=True)
        non_team = [a for a in all_links if "catlink-teams" not in a.get("class", [])]
        if non_team:
            first = non_team[0]
            return first.get_text(strip=True), first["href"]
    prev = table.find_previous_sibling()
    if prev:
        a = prev.find("a", href=True)
        if a:
            return a.get_text(strip=True), a["href"]
    return "", ""


def get_placements(soup):
    """Parse the knockout bracket and return {bracket_team_name: placement}."""
    placements = {}

    # Find the last bracket-grid containing a "Finals" round header
    grids = soup.find_all("div", class_="bracket-grid")
    main_grid = None
    for grid in reversed(grids):
        for h in grid.find_all("div", class_="bracket-grid-header"):
            txt = h.get_text(strip=True).lower()
            if "final" in txt and "semi" not in txt and "quarter" not in txt:
                main_grid = grid
                break
        if main_grid:
            break

    if not main_grid:
        return placements

    # Map round number → header text
    round_texts = {}
    for h in main_grid.find_all("div", class_="bracket-grid-header"):
        for cls in h.get("class", []):
            m = re.match(r"^round(\d+)$", cls)
            if m:
                round_texts[int(m.group(1))] = h.get_text(strip=True)
                break

    if not round_texts:
        return placements

    # Identify the Finals round (highest round with "final" but not "semi"/"quarter")
    finals_rn = None
    for rn in sorted(round_texts.keys(), reverse=True):
        txt = round_texts[rn].lower()
        if "final" in txt and "semi" not in txt and "quarter" not in txt:
            finals_rn = rn
            break
    if finals_rn is None:
        finals_rn = max(round_texts.keys())

    def loser_placement(rn):
        txt = round_texts.get(rn, "").lower()
        if rn == finals_rn:
            return "finalist"
        if "semi" in txt:
            return "semifinalist"
        if "quarter" in txt:
            return "quarterfinalist"
        dist = finals_rn - rn
        if dist == 1:
            return "semifinalist"
        if dist == 2:
            return "quarterfinalist"
        return "groups"

    for rn in sorted(round_texts.keys()):
        lp = loser_placement(rn)
        teams = main_grid.select(f"div.bracket-team.round{rn}")

        i = 0
        while i + 1 < len(teams):
            t1, t2 = teams[i], teams[i + 1]
            n1 = t1.get("data-teamhighlight", "").strip()
            n2 = t2.get("data-teamhighlight", "").strip()
            w1 = "bracket-winner" in t1.get("class", [])
            w2 = "bracket-winner" in t2.get("class", [])

            if n1 and n2:
                if w1 and not w2:
                    placements[n2] = lp
                    if rn == finals_rn:
                        placements[n1] = "champion"
                elif w2 and not w1:
                    placements[n1] = lp
                    if rn == finals_rn:
                        placements[n2] = "champion"
            i += 2

    return placements


# Known cases where short name / acronym differs from full bracket name
_TEAM_NORM_ALIASES = {
    "rng": "royalnevergiveup",
}

def _norm_for_match(name):
    """Normalize team name for placement fuzzy matching."""
    n = name.lower().strip()
    n = re.sub(r"\s+(esports?|gaming|e-sports|ggteam|club)\s*$", "", n)
    n = re.sub(r"['\-\.\s]+", "", n)
    n = _ascii_normalize(n)
    return _TEAM_NORM_ALIASES.get(n, n)


def match_placement(roster_name, placements):
    """Fuzzy-match roster team name against bracket placement keys."""
    if not placements:
        return "groups"
    rn = _norm_for_match(roster_name)
    best = None
    best_len = 0
    for bracket_name, pl in placements.items():
        bn = _norm_for_match(bracket_name)
        if rn == bn:
            return pl
        if rn in bn or bn in rn:
            score = len(min(rn, bn, key=len))
            if score > best_len:
                best_len = score
                best = pl
    return best or "groups"


def scrape_tournament(year, base_page, event_label):
    """Scrape all Main Event teams for a tournament. Returns list of roster dicts."""
    # Try main page first (may have rosters and/or bracket)
    html_main = fetch_page(base_page)
    soup_main = BeautifulSoup(html_main, "html.parser") if html_main else None
    tables = soup_main.find_all("table", class_="tournament-roster") if soup_main else []

    # Fall back to /Main_Event for roster tables
    soup_for_rosters = soup_main
    if not tables:
        html_sub = fetch_page(base_page + "/Main_Event")
        if html_sub:
            soup_for_rosters = BeautifulSoup(html_sub, "html.parser")
            tables = soup_for_rosters.find_all("table", class_="tournament-roster")

    if not tables:
        print("  WARNING: no tournament-roster tables found")
        return []

    # Extract bracket placements (main page first, then /Bracket subpage)
    placements = {}
    if soup_main:
        placements = get_placements(soup_main)
    if not placements:
        bracket_html = fetch_page(base_page + "/Bracket")
        if bracket_html:
            placements = get_placements(BeautifulSoup(bracket_html, "html.parser"))

    if placements:
        champion = next((t for t, p in placements.items() if p == "champion"), None)
        print(f"  Bracket: {len(placements)} teams, champion={champion}")
    else:
        print("  WARNING: bracket not found, placements default to 'groups'")

    # Build inline-content map for seed/region extraction
    inline_map = {}
    if soup_for_rosters:
        for block in soup_for_rosters.find_all("div", class_="inline-content"):
            t = block.find("table", class_="tournament-roster")
            if t:
                inline_map[id(t)] = block

    # Play-In region lookup
    playin_region = {}
    playin_html = fetch_page(base_page + "/Play-In")
    if playin_html:
        pi_soup = BeautifulSoup(playin_html, "html.parser")
        for block in pi_soup.find_all("div", class_="inline-content"):
            t_pi = block.find("table", class_="tournament-roster")
            if not t_pi:
                continue
            th_pi = t_pi.find("th")
            pi_team = th_pi.get_text(strip=True) if th_pi else ""
            if not pi_team:
                continue
            seed_txt, seed_href = extract_seed_for_table(block, t_pi)
            region = region_from_seed(seed_txt, seed_href)
            if region:
                playin_region[pi_team] = region

    rosters = []
    for table in tables:
        block = inline_map.get(id(table))
        seed_txt, seed_href = extract_seed_for_table(block, table)
        region = region_from_seed(seed_txt, seed_href)

        team_name, players = parse_roster_table(table)
        if not team_name or len(players) < 5:
            continue

        team_name = clean_team_name(team_name)

        if not region:
            region = playin_region.get(team_name)
        if not region:
            region = team_region_fallback(team_name)
        region = region or "?"

        placement = match_placement(team_name, placements)

        rosters.append({
            "id":        team_id(team_name, year),
            "team":      team_name,
            "year":      year,
            "event":     event_label,
            "region":    region,
            "placement": placement,
            "players":   players,
        })

    return rosters



def main():
    with open(LEGACY_JSON, encoding="utf-8") as f:
        legacy = json.load(f)
    print(f"Loaded {len(legacy)} legacy rosters (2011-2014)")

    scraped = []
    for year, base_page, event_label in TOURNAMENTS:
        print(f"\n[{year}] {event_label} ({base_page})")
        rosters = scrape_tournament(year, base_page, event_label)
        print(f"  -> {len(rosters)} teams scraped")
        for r in rosters:
            missing = sum(1 for p in r["players"] if not p["page"])
            flag = f" ({missing} sin página)" if missing else ""
            print(f"     {r['region']:8} [{r['placement']:16}] {r['team']}{flag}")
        scraped.extend(rosters)

    scraped.sort(key=lambda r: (r["year"], r["event"], r["team"]))
    all_rosters = legacy + scraped

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_rosters, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(all_rosters)} total rosters -> {OUT_JSON}")
    print(f"  Legacy (2011-2014): {len(legacy)}")
    print(f"  Scraped (2015+):    {len(scraped)}")

    print("Ejecuta build.py para generar rostergues/js/data/rosters.js")

    # Summary stats
    by_placement = {}
    for r in all_rosters:
        pl = r.get("placement", "groups")
        by_placement[pl] = by_placement.get(pl, 0) + 1
    missing_region = sum(1 for r in all_rosters if r["region"] == "?")
    missing_page   = sum(1 for r in scraped for p in r["players"] if not p["page"])
    print(f"\nStats: {len(all_rosters)} rosters, {missing_region} missing region, {missing_page} players without page")
    print(f"Placements: { {k: by_placement.get(k,0) for k in ['champion','finalist','semifinalist','quarterfinalist','groups']} }")


if __name__ == "__main__":
    main()
