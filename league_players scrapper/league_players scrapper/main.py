import requests
import asyncio
import aiohttp
import json
import re
import os
import time
from datetime import datetime
from collections import Counter
from bs4 import BeautifulSoup
from urllib.parse import urljoin, unquote

BASE_URL = "https://lol.fandom.com"
API_URL = f"{BASE_URL}/api.php"

REGION_BASE_PAGES = {
    "EMEA": "EMEA_Players",
    "KR": "Korean_Players",
    "CN": "Chinese_Players",
    "APAC": "Asian_Pacific_Players",
    "NA": "North_American_Players",
    "BR": "Brazilian_Players",
}

TIER1_LEAGUES = {"LEC", "LTA", "LCK", "LPL", "LCP"}

INTERNATIONAL_TOURNO_KEYWORDS = [
    "world championship", "worlds", "mid-season invitational", "msi",
    "first stand", "season world championship", "all-star", "iem world",
    "esports world cup", "world cup",
]

LEAGUE_TOURNAMENT_KEYWORDS = {
    "LCK": [
        "lck", "ogn", "champions korea", "ogn champions",
        "lck cup", "lck spring", "lck summer",
    ],
    "LPL": [
        "lpl", "lpl spring", "lpl summer",
    ],
    "LEC": [
        "lec", "eu lcs", "european championship", "eu masters",
    ],
    "LTA": [
        "lta", "na lcs", "north american championship", "lcs pro",
        "lcs spring", "lcs summer", "lcs academy",
        "cblol", "cblol", "brazilian champion", "circuito brasileiro",
        "lla", "liga latinoamerica", "lln", "liga latinoamerica norte",
        "cls", "copa latinoamerica sur",
    ],
    "LCP": [
        "lcp", "pcs", "lms", "gpl", "lst",
        "vcs", "vietnam championship",
        "ljl", "japan league",
        "opl", "oceanic pro league", "lco", "circuit oceania",
        "sea tour", "pcs spring", "pcs summer",
        "ljl spring", "ljl summer",
    ],
}

def _compile_pattern(keywords):
    sorted_kw = sorted(keywords, key=len, reverse=True)
    escaped = [re.escape(kw) for kw in sorted_kw]
    return re.compile(r"\b(?:" + "|".join(escaped) + r")\b", re.IGNORECASE)

LEAGUE_PATTERNS = {
    league: _compile_pattern(keywords)
    for league, keywords in LEAGUE_TOURNAMENT_KEYWORDS.items()
}

INTERNATIONAL_PATTERN = _compile_pattern(INTERNATIONAL_TOURNO_KEYWORDS)

OUTPUT_FILE = "players.json"
CACHE_DIR = "cache"
PLAYER_LIST_CACHE = os.path.join(CACHE_DIR, "player_list.json")
PLAYER_DATA_CACHE = os.path.join(CACHE_DIR, "player_data.json")
CHECKPOINT_CACHE = os.path.join(CACHE_DIR, "checkpoint.json")

API_DELAY = 0.5
last_api_call = 0


def rate_limit():
    global last_api_call
    elapsed = time.time() - last_api_call
    if elapsed < API_DELAY:
        time.sleep(API_DELAY - elapsed)
    last_api_call = time.time()


def api_fetch(page_title):
    rate_limit()
    params = {
        "action": "parse",
        "page": page_title,
        "format": "json",
        "prop": "text",
    }
    try:
        resp = requests.get(API_URL, params=params, timeout=30)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if "error" in data:
            return None
        return data["parse"]["text"]["*"]
    except Exception:
        return None


def extract_player_rows(html):
    soup = BeautifulSoup(html, "html.parser")
    players = []
    seen_hrefs = set()

    rows = soup.select("table.cargoTable tr")
    for row in rows:
        player_link = None
        player_data = {"team": "", "role": "", "country": "", "real_name": ""}

        for td in row.find_all("td"):
            classes = td.get("class", [])
            cls_str = " ".join(classes)

            if "field_ID" in cls_str:
                a = td.find("a", href=True)
                if a and a["href"].startswith("/wiki/") and not a["href"].startswith("/wiki/Special:"):
                    player_id = a.get_text(strip=True)
                    href = a["href"]
                    if href not in seen_hrefs:
                        seen_hrefs.add(href)
                        player_link = {
                            "id": player_id,
                            "url": urljoin(BASE_URL, href),
                            "page_name": href.replace("/wiki/", ""),
                        }

            elif "field_Team" in cls_str:
                player_data["team"] = clean_text(td.get_text(" ", strip=True))
            elif "field_Role" in cls_str:
                player_data["role"] = clean_text(td.get_text(strip=True))
            elif "field_Country" in cls_str:
                country_el = td.select_one(".markup-object-name")
                if country_el:
                    player_data["country"] = clean_text(country_el.get_text(strip=True))
                else:
                    player_data["country"] = clean_text(td.get_text(strip=True))
            elif "field_Name" in cls_str:
                player_data["real_name"] = clean_text(td.get_text(strip=True))

        if player_link:
            player_link.update(player_data)
            players.append(player_link)

    return players


def discover_subpage_links(soup, base_page):
    found = set()

    for a in soup.select("a[href]"):
        href = a["href"]
        if not href.startswith("/wiki/"):
            continue
        page_name = href.replace("/wiki/", "")

        if page_name == base_page:
            continue

        if page_name.startswith(base_page + "/"):
            found.add(page_name)

    return found


def discover_list_pages(region, base_page):
    all_pages_to_scrape = set()
    all_pages_to_scrape.add(base_page)

    base_html = api_fetch(base_page)
    if not base_html:
        print(f"    WARNING: Could not fetch base page {base_page}")
        return []

    base_soup = BeautifulSoup(base_html, "html.parser")

    tab_sub_pages = discover_subpage_links(base_soup, base_page)
    all_pages_to_scrape.update(tab_sub_pages)
    if tab_sub_pages:
        print(f"    Found {len(tab_sub_pages)} sub-pages (tabs + alphabet)")

    for sub_page in list(all_pages_to_scrape):
        if sub_page == base_page:
            continue
        sub_html = api_fetch(sub_page)
        if sub_html:
            sub_soup = BeautifulSoup(sub_html, "html.parser")
            sub_sub = discover_subpage_links(sub_soup, sub_page)
            all_pages_to_scrape.update(sub_sub)

    for sub_page in list(all_pages_to_scrape):
        for split in ALPHABET_SPLITS:
            test_page = f"{sub_page}/{split}"
            if test_page not in all_pages_to_scrape:
                test_html = api_fetch(test_page)
                if test_html and extract_player_rows(test_html):
                    all_pages_to_scrape.add(test_page)
                    print(f"    Found: {test_page}")

    player_list = []
    for page in sorted(all_pages_to_scrape):
        page_html = api_fetch(page)
        if page_html:
            rows = extract_player_rows(page_html)
            for row in rows:
                row["source_region"] = region
            player_list.extend(rows)
            if rows:
                print(f"    {page}: {len(rows)} players")

    return player_list


def parse_infobox(soup):
    infobox = soup.select_one(
        "table.infobox-player-narrow, table.InfoboxPlayer, "
        "table.infobox-player, table.infobox-wide"
    )
    if not infobox:
        return {}

    data = {}

    label_map = {
        "name": ["name", "full name", "real name", "korean name"],
        "country": ["country", "nationality", "residency", "location",
                     "birthplace", "country of birth"],
        "role": ["role", "position", "primary role"],
        "team": ["team", "current team", "team(s)"],
        "birthdate": ["birthdate", "birthday", "date of birth", "birth"],
    }

    rows = infobox.select("tr")
    current_section = None

    for row in rows:
        ths = row.find_all("th")
        tds = row.find_all("td")

        if ths and len(ths) == 1 and not tds:
            th_text = ths[0].get_text(strip=True).lower()
            if "background" in th_text or "competitive" in th_text:
                current_section = th_text

        elif len(tds) == 2:
            label = tds[0].get_text(strip=True).lower().rstrip(":")
            value = tds[1].get_text(" ", strip=True)

            for key, aliases in label_map.items():
                if label in aliases:
                    if key not in data or not data[key]:
                        data[key] = clean_text(value)
                    break

        elif ths and len(tds) == 1:
            label = ths[0].get_text(strip=True).lower().rstrip(":")
            value = clean_text(tds[0].get_text(" ", strip=True))

            for key, aliases in label_map.items():
                if label in aliases:
                    if key not in data or not data[key]:
                        data[key] = value
                    break

    if "country" not in data:
        country_el = infobox.select_one(".country-object .markup-object-name")
        if country_el:
            data["country"] = country_el.get_text(strip=True)

    return data


def parse_tournament_results(soup):
    all_tourney_tables = []

    for heading in soup.find_all("h2"):
        span = heading.find("span", class_="mw-headline")
        if span and "tournament result" in span.get_text(strip=True).lower():
            table = heading.find_next("table", class_="wikitable")
            if table:
                all_tourney_tables.append(table)

    if not all_tourney_tables:
        for table in soup.select("table.wikitable.sortable, table.wikitable"):
            caption = table.find("caption")
            first_th = table.select_one("th.colspan-cell")
            table_text = ""
            if caption:
                table_text = caption.get_text(strip=True).lower()
            elif first_th:
                table_text = first_th.get_text(strip=True).lower()

            if "tournament result" in table_text:
                all_tourney_tables.append(table)

    results = []
    for table in all_tourney_tables:
        results.extend(parse_tourney_table(table))

    return results


def parse_tourney_table(table):
    results = []
    rows = table.select("tbody tr")
    header_cols = []

    for row in rows:
        ths = row.find_all("th")
        tds = row.find_all("td")

        if ths and not tds:
            th_texts = [th.get_text(strip=True).lower() for th in ths]

            has_colspan = len(ths) == 1 and ths[0].get("colspan")
            has_result_word = any(
                "tournament result" in t for t in th_texts
            )
            if has_colspan and has_result_word:
                continue

            if any(
                t in ("tournament", "event", "place", "placement", "pos")
                for t in th_texts
            ):
                header_cols = th_texts
            continue

        if not tds or len(tds) < 2:
            continue

        place_idx = None
        tournament_idx = None

        for i, h in enumerate(header_cols):
            hl = h
            if "tournament" in hl or "event" in hl:
                tournament_idx = i
            if "place" in hl or "placement" in hl or hl == "pos":
                place_idx = i

        if tournament_idx is None:
            tournament_idx = 2 if len(tds) > 2 else 1
        if place_idx is None:
            place_idx = 1

        if place_idx >= len(tds):
            place_idx = 1 if len(tds) > 1 else 0
        if tournament_idx >= len(tds):
            tournament_idx = 2 if len(tds) > 2 else 0

        place = tds[place_idx].get_text(strip=True)
        tournament_name = tds[tournament_idx].get_text(strip=True)

        if tournament_name and place and tournament_name not in ("", "-"):
            results.append({
                "tournament": tournament_name,
                "place": place,
            })

    return results


def clean_text(text):
    text = re.sub(r"[\u2000-\u200f\u200b-\u200d\u2060-\u2064\u202a-\u202e\ufeff\u00ad]", "", text)
    return text.strip()


def extract_year_from_text(text):
    match = re.search(r"(\d{4})", text)
    return int(match.group(1)) if match else None


def parse_team_history(soup):
    teams = []
    table = soup.select_one("table.player-team-history")
    if not table:
        return teams, None

    rows = table.select("tbody tr")
    team_idx = None
    from_idx = None
    to_idx = None
    debut_year = None

    for row in rows:
        ths = row.find_all("th")
        tds = row.find_all("td")

        for i, th in enumerate(ths):
            text = th.get_text(strip=True).lower()
            if text == "team":
                team_idx = i
            elif text in ("from", "start", "joined"):
                from_idx = i
            elif text in ("to", "end", "left"):
                to_idx = i

        if not tds:
            continue

        if team_idx is None and len(tds) >= 2:
            for i, td in enumerate(tds):
                a = td.find("a", href=lambda h: h and h.startswith("/wiki/"))
                if a:
                    team_idx = i
                    break
            if team_idx is None:
                team_idx = 1

        if team_idx is None:
            continue

        team_name = clean_text(tds[team_idx].get_text(" ", strip=True))
        team_date_from = ""
        team_date_to = ""

        for i, td in enumerate(tds):
            text = td.get_text(strip=True)
            if re.match(r"\d{4}-\d{2}-\d{2}", text) or re.match(
                r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}",
                text, re.IGNORECASE
            ):
                if from_idx is None:
                    from_idx = i
                elif to_idx is None and i > from_idx:
                    to_idx = i

        if from_idx is None:
            for i, td in enumerate(tds):
                text = td.get_text(strip=True).lower()
                if i != team_idx and re.search(r"\d{4}", text):
                    if from_idx is None:
                        from_idx = i
                    elif to_idx is None and i > from_idx:
                        to_idx = i

        if from_idx is not None and from_idx < len(tds):
            raw = tds[from_idx].get_text(strip=True)
            date_match = re.match(r"([A-Za-z]+\s*\d{4})", raw)
            if date_match:
                team_date_from = date_match.group(1)
            else:
                year_match = re.match(r"(\d{4})", raw)
                if year_match:
                    team_date_from = year_match.group(1)

        if to_idx is not None and to_idx < len(tds):
            raw_to = tds[to_idx].get_text(strip=True)
            date_match = re.match(r"([A-Za-z]+\s*\d{4})", raw_to)
            if date_match:
                team_date_to = date_match.group(1)
            elif raw_to.lower() in ("present", "current", "now"):
                team_date_to = raw_to
            else:
                year_match = re.match(r"(\d{4})", raw_to)
                if year_match:
                    team_date_to = year_match.group(1)

        if team_name:
            teams.append({
                "equipo": team_name,
                "desde": team_date_from,
                "hasta": team_date_to,
            })

            dates_text = team_date_from + " " + team_date_to
            year_matches = re.findall(r"(\d{4})", dates_text)
            for ym in year_matches:
                year = int(ym)
                if debut_year is None or year < debut_year:
                    debut_year = year

    return teams, debut_year


def calculate_age(birthdate_str):
    if not birthdate_str:
        return None

    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", birthdate_str)
    if match:
        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        today = datetime.now()
        age = today.year - year - ((today.month, today.day) < (month, day))
        return age

    months_map = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }

    pattern = r"([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})"
    match = re.search(pattern, birthdate_str)
    if match:
        month_name = match.group(1).lower()
        day = int(match.group(2))
        year = int(match.group(3))
        month = months_map.get(month_name)
        if month:
            today = datetime.now()
            age = today.year - year - ((today.month, today.day) < (month, day))
            return age

    year_match = re.search(r"(\d{4})", birthdate_str)
    if year_match:
        return datetime.now().year - int(year_match.group(1))

    return None


def classify_tournaments(tournament_results):
    international_titles = []
    national_titles = []
    leagues_found = set()

    for result in tournament_results:
        t_name = result["tournament"].lower()
        place = result["place"].lower().strip()

        place_clean = place.strip().lower()
        is_first = place_clean in ("1", "1st")

        if INTERNATIONAL_PATTERN.search(t_name) and is_first:
            international_titles.append(result["tournament"])

        if "road to lec" in t_name:
            continue

        for league, pattern in LEAGUE_PATTERNS.items():
            if pattern.search(t_name):
                leagues_found.add(league)
                if is_first:
                    national_titles.append(result["tournament"])
                break

    return international_titles, national_titles, leagues_found


def determine_region_from_teams(team_history):
    league_votes = Counter()

    for team_entry in team_history:
        team_lower = team_entry.get("equipo", "").lower()
        from_date = team_entry.get("desde", "")

        year = None
        ym = re.search(r"(\d{4})", from_date)
        if ym:
            year = int(ym.group(1))

        if year and year < 2013:
            continue

        for league, pattern in LEAGUE_PATTERNS.items():
            if pattern.search(team_lower):
                league_votes[league] += 1

    return league_votes


def check_if_tier1(tournament_results):
    leagues_found = set()
    for result in tournament_results:
        t_name = result["tournament"].lower()
        if "road to lec" in t_name:
            continue
        for league, pattern in LEAGUE_PATTERNS.items():
            if pattern.search(t_name):
                leagues_found.add(league)
                break
    return leagues_found if leagues_found else None


def quick_check_tier1_from_html(html):
    soup = BeautifulSoup(html, "html.parser")
    tournament_results = parse_tournament_results(soup)
    return check_if_tier1(tournament_results)


def parse_player_page_full(html_main, html_tourney, player):
    soup = BeautifulSoup(html_main, "html.parser")

    infobox = parse_infobox(soup)

    if html_tourney:
        tourney_soup = BeautifulSoup(html_tourney, "html.parser")
        tournament_results = parse_tournament_results(tourney_soup)
    else:
        tournament_results = parse_tournament_results(soup)

    team_history, debut_year = parse_team_history(soup)

    age = calculate_age(infobox.get("birthdate", ""))

    international_titles, national_titles, leagues_found = classify_tournaments(
        tournament_results
    )

    region = None
    if leagues_found:
        league_priority = Counter()
        for t_result in tournament_results:
            t_name = t_result["tournament"].lower()
            for league in leagues_found:
                pattern = LEAGUE_PATTERNS.get(league)
                if pattern and pattern.search(t_name):
                    league_priority[league] += 1
        if league_priority:
            region = league_priority.most_common(1)[0][0]
        else:
            region = next(iter(sorted(leagues_found)))

    if not region:
        team_league_votes = determine_region_from_teams(team_history)
        if team_league_votes:
            region = team_league_votes.most_common(1)[0][0]
            leagues_found.add(region)

    equipo_actual = infobox.get("team", "") or player.get("team", "")
    posicion = infobox.get("role", "") or player.get("role", "")
    nacionalidad = infobox.get("country", "") or player.get("country", "")

    player_data = {
        "id": player["id"],
        "page": unquote(player["page_name"]).replace("_", " "),   # clave en build.py
        "nombre_real": infobox.get("name", ""),
        "nacionalidad": nacionalidad,
        "posicion": posicion,
        "edad": age,
        "equipo_actual": equipo_actual,
        "region": region,
        "leagues": sorted(leagues_found) if leagues_found else [],
        "debut": debut_year,
        "titulos_internacionales": international_titles,
        "titulos_nacionales": national_titles,
        "historial_equipos": team_history,
    }

    return player_data


async def check_and_parse_player(session, player, sem, parse_sem):
    async with sem:
        page_name = player["page_name"]
        params = {"action": "parse", "format": "json", "prop": "text"}

        async def _fetch(page):
            p = {**params, "page": page}
            try:
                async with session.get(API_URL, params=p, timeout=30) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if "error" not in data:
                            return data["parse"]["text"]["*"]
            except Exception:
                pass
            return None

        main_html, tourney_html = await asyncio.gather(
            _fetch(page_name),
            _fetch(page_name + "/Tournament_Results"),
        )

    if not main_html:
        return None

    if tourney_html:
        tourney_soup = BeautifulSoup(tourney_html, "html.parser")
        tournament_results = parse_tournament_results(tourney_soup)
    else:
        soup = BeautifulSoup(main_html, "html.parser")
        tournament_results = parse_tournament_results(soup)

    leagues_found = check_if_tier1(tournament_results)

    if not leagues_found:
        return None

    if not TIER1_LEAGUES.intersection(leagues_found):
        return None

    return parse_player_page_full(main_html, tourney_html, player)


async def scrape_tier1_players(player_list, concurrency=15):
    sem = asyncio.Semaphore(concurrency)
    results = []

    if os.path.exists(CHECKPOINT_CACHE):
        with open(CHECKPOINT_CACHE, "r", encoding="utf-8") as f:
            chk = json.load(f)
        results = chk.get("results", [])
        processed = set(chk.get("processed", []))
        print(f"  Resuming from checkpoint: {len(results)} tier1, "
              f"{len(processed)} processed")
    else:
        processed = set()

    checked = len(processed)
    tier1_count = len(results)

    remaining = [p for p in player_list if p["page_name"] not in processed]
    batch_size = concurrency * 5

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(remaining), batch_size):
            batch = remaining[i : i + batch_size]
            tasks = [check_and_parse_player(session, p, sem, sem) for p in batch]
            batch_results = await asyncio.gather(*tasks)

            for player, result in zip(batch, batch_results):
                checked += 1
                processed.add(player["page_name"])
                if result:
                    results.append(result)
                    tier1_count += 1

            pct = checked / len(player_list) * 100
            print(f"\r  [{checked}/{len(player_list)}] ({pct:.1f}%) | "
                  f"{tier1_count} tier1     ", end="", flush=True)

            batch_num = i // batch_size
            if batch_num % 30 == 0:
                with open(CHECKPOINT_CACHE, "w", encoding="utf-8") as f:
                    json.dump({
                        "results": results,
                        "processed": sorted(processed),
                    }, f, ensure_ascii=False)

    if os.path.exists(CHECKPOINT_CACHE):
        os.remove(CHECKPOINT_CACHE)

    print()
    return results


def main():
    print("=" * 60)
    print("LoL Player Scraper -- Tier 1 Leagues")
    print("LEC, LTA, LCK, LPL, LCP")
    print("=" * 60)

    os.makedirs(CACHE_DIR, exist_ok=True)

    if os.path.exists(PLAYER_LIST_CACHE):
        print("\n[Phase 1] Loading cached player list...")
        with open(PLAYER_LIST_CACHE, "r", encoding="utf-8") as f:
            all_players = json.load(f)
        print(f"  Loaded {len(all_players)} players from cache.")
    else:
        print("\n[Phase 1] Scraping player lists from all regions...")
        all_players = []

        for region, base_page in REGION_BASE_PAGES.items():
            print(f"\n  [{region}] {base_page}")
            players = discover_list_pages(region, base_page)
            print(f"  => {len(players)} players found for {region}")
            all_players.extend(players)

        seen = set()
        unique_players = []
        for p in all_players:
            key = p["page_name"]
            if key not in seen:
                seen.add(key)
                unique_players.append(p)

        all_players = unique_players
        print(f"\n  Total unique players: {len(all_players)}")

        with open(PLAYER_LIST_CACHE, "w", encoding="utf-8") as f:
            json.dump(all_players, f, ensure_ascii=False, indent=2)
        print(f"  Saved to {PLAYER_LIST_CACHE}")

    print(f"\n[Phase 2] Checking {len(all_players)} players and "
          f"full-scraping Tier 1...")
    player_data = asyncio.run(scrape_tier1_players(all_players))

    with open(PLAYER_DATA_CACHE, "w", encoding="utf-8") as f:
        json.dump(player_data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(player_data)} Tier 1 player records")

    COMPETITIVE_ROLES = {"Top", "Jungler", "Mid", "Bot", "Support"}
    def is_competitive(posicion):
        for role in COMPETITIVE_ROLES:
            if role.lower() in posicion.lower():
                return True
        return False

    player_data = [p for p in player_data if is_competitive(p.get("posicion", ""))]
    print(f"\n[Filter] After role filter (Top/Jungler/Mid/Bot/Support): "
          f"{len(player_data)} players")

    output = {
        "total_players": len(player_data),
        "leagues": sorted(TIER1_LEAGUES),
        "scraped_at": datetime.now().isoformat(),
        "players": player_data,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n[Done] Exported to {OUTPUT_FILE}")
    print("  By league:")
    for league in sorted(TIER1_LEAGUES):
        count = len([p for p in player_data if p.get("region") == league])
        print(f"    {league}: {count}")


if __name__ == "__main__":
    main()
